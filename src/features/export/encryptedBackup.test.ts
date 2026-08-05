import { describe, expect, it } from 'vitest'
import {
  decryptBackupJson,
  encryptBackupJson,
  isEncryptedBackupEnvelope,
  WrongBackupPasswordError,
} from './encryptedBackup'

describe('encryptedBackup (#608)', () => {
  it('round-trips plaintext through encrypt then decrypt with the correct password', async () => {
    const json = JSON.stringify({ goals: [], dailyEntries: [] })
    const envelope = await encryptBackupJson(json, 'correct horse battery staple')

    const decrypted = await decryptBackupJson(
      envelope,
      'correct horse battery staple',
    )
    expect(decrypted).toBe(json)
  })

  it('produces a different ciphertext each time, even for the same input', async () => {
    const json = JSON.stringify({ goals: [] })
    const first = await encryptBackupJson(json, 'password')
    const second = await encryptBackupJson(json, 'password')

    expect(first.ciphertext).not.toBe(second.ciphertext)
    expect(first.salt).not.toBe(second.salt)
    expect(first.iv).not.toBe(second.iv)
  })

  it('throws WrongBackupPasswordError for a wrong password, without returning anything', async () => {
    const json = JSON.stringify({ goals: [] })
    const envelope = await encryptBackupJson(json, 'right password')

    await expect(
      decryptBackupJson(envelope, 'wrong password'),
    ).rejects.toBeInstanceOf(WrongBackupPasswordError)
  })

  it('isEncryptedBackupEnvelope recognizes a real envelope', async () => {
    const envelope = await encryptBackupJson('{}', 'password')
    expect(isEncryptedBackupEnvelope(envelope)).toBe(true)
  })

  it('isEncryptedBackupEnvelope rejects a plain (unencrypted) backup bundle', () => {
    expect(
      isEncryptedBackupEnvelope({ version: 10, goals: [], dailyEntries: [] }),
    ).toBe(false)
  })

  it('isEncryptedBackupEnvelope rejects non-objects', () => {
    expect(isEncryptedBackupEnvelope(null)).toBe(false)
    expect(isEncryptedBackupEnvelope('a string')).toBe(false)
    expect(isEncryptedBackupEnvelope(42)).toBe(false)
  })
})
