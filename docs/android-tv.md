# KinoHub TV APK

`apps/android` is a deliberately thin Android TV shell around the hosted KinoHub UI.
It uses the device's system WebView and contains no browser engine, media player,
background service, AndroidX, Kotlin runtime, analytics, or third-party dependency.

## Runtime behavior

- Loads `http://192.168.0.120:4100/` in a fullscreen system WebView.
- Keeps DPAD navigation and focus handling in the shared web application.
- Intercepts only `kinohub-player://` links generated for the `KinoHubTV` user agent.
- Validates that playback targets use HTTP(S), then opens Android's native player chooser.
- Keeps ordinary browser and MSX playback behavior unchanged.

The server URL is compiled in `apps/android/app/build.gradle` as `KinoHub_URL`.
Change this value and rebuild if the KinoHub host address changes.

## Install

The current sideloadable artifact is `artifacts/apk/kinohub-tv-0.1.0.apk`.
It is optimized with R8/resource shrinking and signed with a local debug key for private testing.

Install it by copying the APK to the projector and opening it with a file manager, or via ADB:

```powershell
adb connect PROJECTOR_IP:5555
adb install -r artifacts/apk/kinohub-tv-0.1.0.apk
```

The projector must be able to reach both `192.168.0.120:4100` (KinoHub) and
`192.168.0.120:8091` (TorrServer).

## Build

Required build components are JDK 17, Android SDK platform 35, and Gradle 8.9.
From `apps/android`, run:

```powershell
gradle :app:assembleRelease
```

For distribution beyond private sideload testing, replace the debug signing configuration
with a persistent private release keystore and increment `versionCode`.
