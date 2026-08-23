# KinoHub TV APK

`apps/android` is a deliberately thin Android TV shell around the hosted KinoHub UI.
It uses the device's system WebView and contains no browser engine, media player,
background service, AndroidX, Kotlin runtime, analytics, or third-party dependency.

## Runtime behavior

- Asks for the KinoHub server address on first launch and stores it locally.
- Lets the user change that address later from KinoHub's **Настройка** page.
- Reopens the native address dialog when the configured server cannot be reached.
- Keeps DPAD navigation and focus handling in the shared web application.
- Gives the web UI first chance to close dialogs or dismiss the keyboard on Back.
- Intercepts only `kinohub-player://` links generated for the `KinoHubTV` user agent.
- Validates that playback targets use HTTP(S), then opens Android's native player chooser.
- Keeps ordinary browser and MSX playback behavior unchanged.

The initial suggestion is compiled in `apps/android/app/build.gradle` as `KINOHUB_URL`,
but moving KinoHub to another host does not require rebuilding or reinstalling the APK.

## Install

The current sideloadable artifact is `artifacts/apk/kinohub-tv-0.3.0.apk`.
It is optimized with R8/resource shrinking and signed with a local debug key for private testing.

Install it by copying the APK to the projector and opening it with a file manager, or via ADB:

```powershell
adb connect PROJECTOR_IP:5555
adb install -r artifacts/apk/kinohub-tv-0.3.0.apk
```

The TV/projector must be able to reach the configured KinoHub address and the
`PUBLIC_TORRSERVER_URL` from `.env`. Use the server's real LAN hostname or static IP.

## Build

Required build components are JDK 17, Android SDK platform 35, and Gradle 8.9.
From `apps/android`, run:

```powershell
gradle :app:assembleRelease
```

For distribution beyond private sideload testing, replace the debug signing configuration
with a persistent private release keystore and increment `versionCode`.
