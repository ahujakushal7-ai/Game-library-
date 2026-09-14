# Game Library

Windows desktop launcher (Tauri v2) that signs you into **Steam**, **Epic Games**, and **PlayStation**, then imports each library into one dark poster grid.

## Download / install (Windows)

1. Install [Node.js 22+](https://nodejs.org/), [Rust](https://rustup.rs/), and [Visual Studio 2022 Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the **Desktop development with C++** workload.
2. From PowerShell:

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
npm install
npm run tauri -- build
```

The installer is written to:

`src-tauri/target/release/bundle/nsis/Game Library_0.1.0_x64-setup.exe`

Install that `.exe` like any other Windows app. The first run may also install WebView2 if Windows does not already have it.

## Account import

- **Steam:** Sign in with Steam OpenID. Add your own [Steam Web API key](https://steamcommunity.com/dev/apikey) (domain can be `localhost`) to import the full owned library. Installed Steam games are scanned as a fallback.
- **Epic Games:** Sign in in the browser, copy `authorizationCode` from the JSON page, paste it in the app.
- **PlayStation:** Sign in on PlayStation.com, open the NPSSO page, paste the token. Treat NPSSO like a password.

Tokens stay on this PC in the app data folder. They are not uploaded to a Game Library server.

## Dev

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
npm install
npm run tauri -- dev
```
