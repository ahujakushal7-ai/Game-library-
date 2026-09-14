# Game Library

Cross-platform desktop game launcher built with **Tauri v2**, **React (TypeScript)**, and **Tailwind CSS**. It aggregates Steam, Epic Games, and PlayStation 5 titles in a dark poster grid and launches them through native URI handlers (or PlayStation Remote Play for console games).

## Run

```bash
npm install
npm run tauri dev
```

Frontend-only preview (no native launch bridge):

```bash
npm run dev
```

Windows desktop builds need the [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (`link.exe`) in addition to Node.js and Rust.
