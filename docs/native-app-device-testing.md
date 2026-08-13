# Testing the native app on a device

How to get the Capacitor-wrapped app (see `ARCHITECTURE.md`'s "Native app
shell (Capacitor, #305)" row for the underlying setup and build gotchas)
running on an actual phone, for on-device validation of native-shell issues
(#305 and its follow-ups under #304).

This only produces **debug** builds — unsigned, dev-only, not what ships to
a store. Release signing is separate, later work (#316/#317 for Android).

## Android — works today, no extra accounts needed

1. On the phone: **Settings → About phone** → tap "Build number" 7 times
   (unlocks Developer Options) → **Settings → System → Developer options**
   → enable **USB debugging**.
2. Plug the phone into the dev machine via USB. A prompt appears on the
   phone asking to allow USB debugging from this computer — allow it
   (check "always allow from this computer" to skip this next time).
3. Confirm it's recognized:
   ```
   adb devices
   ```
   (`adb` is at `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` if not
   on PATH.)
4. Build the debug APK from the `android/` directory (needs `JAVA_HOME`
   pointed at a JDK — Android Studio's bundled one works and needs no
   separate install):
   ```
   JAVA_HOME="C:\Program Files\Android\Android Studio\jbr" ./gradlew.bat assembleDebug
   ```
   First build also needs `android/local.properties` with
   `sdk.dir=C:/Users/User/AppData/Local/Android/Sdk` — already present in
   this repo (gitignored, machine-local).
5. Install and launch on whichever device `adb` sees (add `-s <serial>`
   if more than one device/emulator is attached at once):
   ```
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   adb shell am start -n io.github.zhannam85.turtlesteps/.MainActivity
   ```
6. Open the app on the phone and check it yourself — that's the actual
   validation step. Don't mark an issue validated off a screenshot or an
   emulator run alone.

**No cable available?** Android also supports wireless debugging:
Developer options → Wireless debugging → pair via QR code. Same `adb`
access, no USB needed after pairing.

**Prefer a GUI?** `npx cap open android` opens the project in Android
Studio — pick the connected device from the target dropdown and hit Run
instead of the CLI steps above.

## iOS — Mac + Xcode (free Apple ID is enough for device debug)

Building or running the iOS project requires Xcode (macOS-only). A **free**
Apple ID is enough to install a debug build on your own iPhone — the paid
$99/year Apple Developer Program is only needed later for TestFlight /
App Store distribution (#313).

1. Sync web assets into the native project when needed:
   `npm run build` then `npx cap sync ios` (plain `npm run build`, not the
   Pages `--base=…` deploy build — see ARCHITECTURE).
2. Open `ios/App/App.xcodeproj` in Xcode (this Capacitor project uses
   Swift Package Manager / `CapApp-SPM`, so there is no top-level
   `.xcworkspace` — that only appears with CocoaPods).
3. Signing & Capabilities → Team: sign in with your Apple ID (Personal Team).
4. Connect an iPhone via USB, select it as the run target, hit Run.
5. **#306 camera check:** open Add meal → barcode scanner. Expect the iOS
   camera permission prompt (copy comes from `NSCameraUsageDescription` in
   `ios/App/App/Info.plist`). Grant → live preview; deny → #291 manual
   barcode entry should still work.

**iOS splash regenerate (#697):** if splash assets need regenerating, use a
larger logo scale than the `@capacitor/assets` default (`0.2`), or the
padded `resources/icon.png` (#311) looks tiny on cold launch:
`npx @capacitor/assets generate --ios --iconBackgroundColor '#ffffff' --iconBackgroundColorDark '#0f181c' --splashBackgroundColor '#ffffff' --splashBackgroundColorDark '#0f181c' --logoSplashScale 0.65`
Do **not** pass `--android` unless intentionally refreshing Android too
(#653 splash wrapper is hand-authored and survives splash PNG rewrites).

A free Apple ID cannot distribute via TestFlight; that still needs #313.
