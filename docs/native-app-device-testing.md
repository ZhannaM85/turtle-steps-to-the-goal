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

## iOS — needs a Mac, not possible from this Windows machine

Building or running the iOS project requires Xcode, which is macOS-only —
there's no Windows workaround, and Capacitor doesn't change that. This is
exactly why #304 planned Android first.

Once a Mac is available:

1. Open `ios/App/App.xcworkspace` in Xcode — the `.xcworkspace`, not
   `.xcodeproj` (the project uses CocoaPods/SPM).
2. Sign in with an Apple ID. A **free** account is enough to run on your
   own physical device for local testing — the paid $99/year Apple
   Developer Program is only needed later, for TestFlight/App Store
   distribution (#313).
3. Connect an iPhone via USB, select it as the run target, hit Run.
