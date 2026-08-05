/**
 * Optional password-encrypted JSON backup (#608) — AES-GCM via the
 * browser's own Web Crypto (`crypto.subtle`), no third-party crypto
 * library. The plaintext export (`ExportSection.tsx`'s existing "Export
 * backup" button) stays available and unchanged; this is a second,
 * separate download for anyone who wants the file itself protected at
 * rest (e.g. before it sits in a Downloads folder or a cloud-synced
 * folder). The password is never sent anywhere or stored by this app —
 * it only ever lives in a dialog's own local state for the one
 * encrypt/decrypt call, and a forgotten password makes the file
 * permanently unrecoverable (there is no backdoor/reset, by design of
 * AES-GCM + PBKDF2 key derivation).
 */

/** High-ish iteration count — this runs once per export/import, not in a
 * hot loop, so the extra cost is worth the stronger resistance to an
 * offline password-guessing attack against a stolen file. */
const PBKDF2_ITERATIONS = 250_000
const AES_KEY_LENGTH_BITS = 256
const SALT_LENGTH_BYTES = 16
const IV_LENGTH_BYTES = 12

export interface EncryptedBackupEnvelope {
  encrypted: true
  /** Envelope format version — distinct from `ExportBundle`'s own
   * `version`, which lives inside the encrypted plaintext and is
   * unaffected by this wrapper. */
  version: 1
  /** Base64-encoded PBKDF2 salt. */
  salt: string
  /** Base64-encoded AES-GCM initialization vector. */
  iv: string
  /** Base64-encoded ciphertext (includes the GCM authentication tag). */
  ciphertext: string
}

/** Thrown by `decryptBackupJson` on a wrong password or corrupted file —
 * AES-GCM's authentication tag fails to verify in both cases, and
 * `crypto.subtle.decrypt` itself throws before anything is written
 * anywhere, so there's no risk of a partial/corrupted decrypt reaching
 * `importAllData`. */
export class WrongBackupPasswordError extends Error {}

function toBase64(bytes: ArrayBuffer): string {
  let binary = ''
  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function fromBase64(base64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: AES_KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Encrypts an already-serialized backup (`JSON.stringify(exportBundle)`)
 * with a fresh random salt + IV each call, so encrypting the same backup
 * twice with the same password never produces the same ciphertext. */
export async function encryptBackupJson(
  json: string,
  password: string,
): Promise<EncryptedBackupEnvelope> {
  const salt: Uint8Array<ArrayBuffer> = crypto.getRandomValues(
    new Uint8Array(SALT_LENGTH_BYTES),
  )
  const iv: Uint8Array<ArrayBuffer> = crypto.getRandomValues(
    new Uint8Array(IV_LENGTH_BYTES),
  )
  const key = await deriveKey(password, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(json),
  )
  return {
    encrypted: true,
    version: 1,
    salt: toBase64(salt.buffer),
    iv: toBase64(iv.buffer),
    ciphertext: toBase64(ciphertext),
  }
}

/** Structural check only (shape, not cryptographic validity) — used by
 * the import flow to decide whether to show the password dialog at all,
 * before any password has been entered. */
export function isEncryptedBackupEnvelope(
  value: unknown,
): value is EncryptedBackupEnvelope {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    candidate.encrypted === true &&
    typeof candidate.salt === 'string' &&
    typeof candidate.iv === 'string' &&
    typeof candidate.ciphertext === 'string'
  )
}

/** Reverses `encryptBackupJson`. Throws `WrongBackupPasswordError` for
 * either a wrong password or a corrupted/tampered file — AES-GCM's own
 * authentication tag can't distinguish the two, and there's no reason a
 * user-facing message needs to. */
export async function decryptBackupJson(
  envelope: EncryptedBackupEnvelope,
  password: string,
): Promise<string> {
  const salt = fromBase64(envelope.salt)
  const iv = fromBase64(envelope.iv)
  const key = await deriveKey(password, salt)
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      fromBase64(envelope.ciphertext),
    )
    return new TextDecoder().decode(plaintext)
  } catch {
    throw new WrongBackupPasswordError(
      'Wrong password, or the file is corrupted.',
    )
  }
}
