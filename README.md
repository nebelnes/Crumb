# Наан — калькулятор теста (Android)

Android app that wraps the naan dough calculator. The calculator page is bundled inside the app, so it works offline. Formula edits are saved on the phone.

## Get the APK without installing anything (GitHub)
1. Create a new repository on github.com and upload the contents of this folder (including the hidden `.github` folder).
2. Open the **Actions** tab. The "Build APK" workflow runs automatically (about 3–5 minutes).
3. Open the finished run and download **naan-calculator-apk**. Unzip it to get `app-release.apk`.
4. Copy the APK to your phone, open it, and allow "Install unknown apps" when Android asks.

## Or build in Android Studio
Open this folder in Android Studio, wait for Gradle sync, then use **Build > Build App Bundle(s) / APK(s) > Build APK(s)**, or press Run with your phone connected.

## Updating the calculator
Replace `app/src/main/assets/index.html` with a new version of the page and rebuild.
Requires Android 8.0 or newer.
