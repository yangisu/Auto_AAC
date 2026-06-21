# Android TWA

Use JDK 17 and an Android SDK containing API 35. A release bundle remains unsigned and
buildable when the signing environment variables are unset. Run from this directory:

```powershell
.\gradlew.bat clean :app:assembleDebug
.\gradlew.bat :app:bundleRelease
```

The APK is written to `app/build/outputs/apk/debug/app-debug.apk`. `bundleRelease` writes
the bundle to `app/build/outputs/bundle/release/app-release.aab`.

To build a signed release, set `JAVA_HOME` to the JDK 17 installation directory and set all
four signing variables in the same PowerShell session. The password prompts below do not
echo their input:

```powershell
try {
    if (-not $env:JAVA_HOME) { throw "JAVA_HOME must point to JDK 17." }
    $jarsigner = Join-Path $env:JAVA_HOME "bin\jarsigner.exe"
    $keytool = Join-Path $env:JAVA_HOME "bin\keytool.exe"
    if (-not (Test-Path -LiteralPath $jarsigner)) { throw "jarsigner.exe was not found under JAVA_HOME." }
    if (-not (Test-Path -LiteralPath $keytool)) { throw "keytool.exe was not found under JAVA_HOME." }

    $env:AUTO_AAC_UPLOAD_KEYSTORE = Read-Host "Absolute upload keystore path"
    $env:AUTO_AAC_UPLOAD_KEY_ALIAS = Read-Host "Upload key alias"
    $storePassword = Read-Host "Upload keystore password" -AsSecureString
    $keyPassword = Read-Host "Upload key password" -AsSecureString
    $env:AUTO_AAC_UPLOAD_STORE_PASSWORD = [System.Net.NetworkCredential]::new("", $storePassword).Password
    $env:AUTO_AAC_UPLOAD_KEY_PASSWORD = [System.Net.NetworkCredential]::new("", $keyPassword).Password

    .\gradlew.bat clean :app:bundleRelease
    if ($LASTEXITCODE -ne 0) { throw "Release bundle build failed." }

    $bundlePath = ".\app\build\outputs\bundle\release\app-release.aab"
    $verificationOutput = & $jarsigner -verify -verbose -certs $bundlePath 2>&1
    $jarsignerExitCode = $LASTEXITCODE
    $verificationText = $verificationOutput -join [Environment]::NewLine
    $verificationOutput | Write-Output
    if ($jarsignerExitCode -ne 0 -or
        $verificationText -match "jar is unsigned" -or
        $verificationText -notmatch "jar verified") {
        throw "Release bundle signature verification failed."
    }

    & $keytool -list -v -keystore $env:AUTO_AAC_UPLOAD_KEYSTORE `
        -alias $env:AUTO_AAC_UPLOAD_KEY_ALIAS `
        -storepass:env AUTO_AAC_UPLOAD_STORE_PASSWORD
    if ($LASTEXITCODE -ne 0) { throw "Upload certificate inspection failed." }
} finally {
    Remove-Item Env:AUTO_AAC_UPLOAD_KEYSTORE -ErrorAction SilentlyContinue
    Remove-Item Env:AUTO_AAC_UPLOAD_STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:AUTO_AAC_UPLOAD_KEY_ALIAS -ErrorAction SilentlyContinue
    Remove-Item Env:AUTO_AAC_UPLOAD_KEY_PASSWORD -ErrorAction SilentlyContinue
}
```

Compare the `SHA256` fingerprint printed by `keytool -list -v` with the SHA-256 fingerprint
shown for the upload certificate in Play Console. A mismatch means the bundle must not be
uploaded.

When all four variables are unset or blank, Gradle produces an unsigned bundle. If only
some values are nonblank, configuration fails and lists the required variable names. Keep
the upload key outside Git and backed up securely. The Play App Signing certificate differs
from the upload certificate: Google signs distributed artifacts with the app-signing key,
while the upload key authenticates uploads.
