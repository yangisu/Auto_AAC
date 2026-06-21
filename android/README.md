# Android TWA

Use JDK 17 and an Android SDK containing API 35. A release bundle remains unsigned and
buildable when the signing environment variables are unset. Run from this directory:

```powershell
.\gradlew.bat clean :app:assembleDebug
.\gradlew.bat :app:bundleRelease
```

The APK is written to `app/build/outputs/apk/debug/app-debug.apk`. `bundleRelease` writes
the bundle to `app/build/outputs/bundle/release/app-release.aab`.

To build a signed release, set all four variables in the same PowerShell session. The
password prompts below do not echo their input:

```powershell
$env:AUTO_AAC_UPLOAD_KEYSTORE = Read-Host "Absolute upload keystore path"
$env:AUTO_AAC_UPLOAD_KEY_ALIAS = Read-Host "Upload key alias"
$storePassword = Read-Host "Upload keystore password" -AsSecureString
$keyPassword = Read-Host "Upload key password" -AsSecureString
$env:AUTO_AAC_UPLOAD_STORE_PASSWORD = [System.Net.NetworkCredential]::new("", $storePassword).Password
$env:AUTO_AAC_UPLOAD_KEY_PASSWORD = [System.Net.NetworkCredential]::new("", $keyPassword).Password

.\gradlew.bat clean :app:bundleRelease
jarsigner -verify -verbose -certs .\app\build\outputs\bundle\release\app-release.aab
```

If any variable is missing or blank, Gradle does not apply the release signing config and
produces an unsigned bundle. Keep the upload key outside Git and backed up securely. The
Play App Signing certificate differs from the upload certificate: Google signs distributed
artifacts with the app-signing key, while the upload key authenticates uploads.
