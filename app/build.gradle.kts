plugins { id("com.android.application") }

android {
    namespace = "com.naan.calculator"
    compileSdk = 34
    defaultConfig {
        applicationId = "com.naan.calculator"
        minSdk = 26
        targetSdk = 34
        // Each GitHub build gets a higher number so phones accept it as an update.
        val build = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
        versionCode = build
        versionName = "1.$build"
    }
    signingConfigs {
        // One fixed key, kept in this private repo, so every build can update the installed app.
        create("release") {
            storeFile = file("naan-release.jks")
            storePassword = "naancalc"
            keyAlias = "naan"
            keyPassword = "naancalc"
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
