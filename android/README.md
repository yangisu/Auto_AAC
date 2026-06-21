# Android TWA

Use JDK 17 and an Android SDK containing API 35, then run from this directory:

```powershell
.\gradlew.bat clean :app:assembleDebug
.\gradlew.bat :app:bundleRelease
```

The APK is written to `app/build/outputs/apk/debug/app-debug.apk`. `bundleRelease` writes an unsigned bundle to `app/build/outputs/bundle/release/app-release.aab`; signing is intentionally not configured in Gradle.

Keep the Play upload keystore and all passwords outside Git. Sign the AAB with the upload key in a private release pipeline before uploading it to Play Console.
