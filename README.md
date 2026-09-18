<div align="center">

  <img src="assets/logo.png" alt="PixelSlim Logo" width="128" height="128" />

  # PixelSlim ⚡
  
  **Ultra-lightweight, blazing-fast native batch image optimizer and format converter for macOS.**

  [![GitHub Release](https://img.shields.io/github/v/release/zeospec/PixelSlim?color=blue&logo=github)](https://github.com/zeospec/PixelSlim/releases/latest)
  [![Platform](https://img.shields.io/badge/platform-macOS%20(Universal)-black?logo=apple)](https://github.com/zeospec/PixelSlim/releases/latest)
  [![Rust](https://img.shields.io/badge/engine-Rust%202021-orange?logo=rust)](https://www.rust-lang.org/)
  [![Tauri v2](https://img.shields.io/badge/shell-Tauri%20v2-24C8D8?logo=tauri)](https://v2.tauri.app/)
  [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
  [![Privacy](https://img.shields.io/badge/privacy-100%25%20Offline-success)](https://github.com/zeospec/PixelSlim)
  [![Author](https://img.shields.io/badge/author-ZeoSpec-purple)](https://zeospec.com/)

  <br />

  <a href="https://github.com/zeospec/PixelSlim/releases/latest">
    <img src="https://img.shields.io/badge/Download-Universal%20macOS%20DMG%20(v1.0.0)-2563eb?style=for-the-badge&logo=apple&logoColor=white" alt="Download Universal DMG" />
  </a>

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Privacy & Security](#-privacy--security)
- [Key Features](#-key-features)
- [Supported Formats](#-supported-formats)
- [Performance & Benchmark](#-performance--benchmark)
- [Installation](#-installation)
- [Usage & Workflow](#-usage--workflow)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Developer Guide](#-developer-guide)
- [Architecture](#-architecture)
- [Contributing](#-contributing)
- [Feedback & Bug Reports](#-feedback--bug-reports)
- [License](#-license)
- [Author & Credits](#-author--credits)

---

## 🚀 Overview

**PixelSlim** is a high-performance desktop image optimizer built with a native **Rust (Tauri v2)** backend and a zero-dependency web frontend. It replaces heavy multi-hundred megabyte Electron-based utilities with a razor-sharp **lightweight Universal standalone DMG** that runs natively with minimal system resources.

Drop single images, multiple files, entire folder hierarchies, or paste screenshots directly from your clipboard to instantly compress and convert to **WebP**, **PNG**, **JPEG**, or **SVG** without losing visual fidelity.

---

## 🔒 Privacy & Security

- **100% Local & Offline**: All compression and conversion algorithms execute strictly on your device using native Rust binaries.
- **Zero Telemetry**: No tracking, analytics, or background data collection.
- **Zero Cloud Uploads**: Your private photos, confidential designs, and screenshots never touch the internet.

---

## ✨ Key Features

### 🚀 Pure Rust Image Processing Engines
- **PNG Quantization**: 8-bit adaptive palette quantization (`imagequant` / `pngquant` engine) with Floyd-Steinberg dithering + multi-threaded `oxipng` DEFLATE optimization (**50% to 75% file size reduction**).
- **WebP Encoding**: Native Google WebP encoder with lossy quality tuning and 100% lossless compression mode.
- **JPEG Optimization**: High-speed JPEG encoding with customizable quality scale.
- **SVG Minification**: Clean XML minification, stripping unnecessary metadata, comments, and whitespace.

### 🎯 Smart Calibration & Constraints
- **Smart Preset**: Balanced 82% sweet-spot calibration for optimal web delivery and crisp visuals.
- **Target Size Limiter**: Specify an exact maximum size constraint in **KB** or **MB** with automated binary-search calibration.
- **Max Dimension Resizing**: High-fidelity Lanczos3 downscaling (1920px, 2560px, 1280px, 800px) with aspect-ratio preservation.

### 📋 Seamless Workflow Integrations
- **Clipboard Instant Paste**: Press <kbd>Cmd</kbd> + <kbd>V</kbd> anywhere to grab an image from your macOS clipboard and queue it immediately.
- **Batch & Recursive Folder Discovery**: Drop full directory trees; PixelSlim automatically discovers and processes all nested images.
- **Non-Destructive Output**: Output files next to original (with custom suffix like `-min`) or route directly to a dedicated destination folder.
- **Quick Actions**: One-click **Reveal in Finder** and **Copy Image to Clipboard**.

### 🎨 Native macOS Experience
- **Universal Architecture**: One single installer runs natively on both **Apple Silicon (M1/M2/M3/M4)** and **Intel** Macs.
- **3-Way Theme Switcher**: Automatic system appearance following, light mode, and dark mode.
- **Custom Native Titlebar**: Smooth macOS window dragging, traffic light controls, and responsive UI scaling.
- **Auto-Update Checker**: Built-in update verification querying GitHub Releases directly with one-click `.dmg` downloads.

---

## 🔄 Supported Formats

| Input Format | Output Format Options | Optimization Highlights |
|---|---|---|
| **PNG** (`.png`) | WebP, PNG, JPEG, SVG | 8-bit adaptive palette quantization, `oxipng` multi-thread |
| **JPEG** (`.jpg`, `.jpeg`) | WebP, JPEG, PNG, SVG | Chrominance sub-sampling & entropy coding |
| **WebP** (`.webp`) | WebP, PNG, JPEG, SVG | Lossy and 100% lossless conversion |
| **SVG** (`.svg`) | SVG (Minified) | Whitespace, comment, and metadata pruning |
| **GIF** (`.gif`) | WebP, PNG, JPEG | Frame optimization & static format conversion |
| **AVIF** (`.avif`) | WebP, PNG, JPEG | High-density conversion |

---

## 📊 Performance & Benchmark

| Metric | Traditional Electron Apps | PixelSlim (Rust + Tauri v2) | Advantage |
|---|---|---|---|
| **Installer Size (DMG)** | ~120 MB – 180 MB | **Compact Universal DMG** | **Significantly smaller** |
| **Installed App Size** | ~350 MB – 500 MB | **Minimal Disk Footprint** | **Zero bloat** |
| **Memory Footprint (RAM)**| ~250 MB – 450 MB | **Minimal (~40 MB)** | **~85% less RAM** |
| **Cold Startup Time** | ~1.5s – 3.0s | **< 250ms** | **Near Instant** |
| **Architecture Support** | Separate DMGs or 250MB+ bundle | Single **Universal Fat Binary** | Native M1/M2/M3/M4 & Intel |

---

## 📥 Installation

### Download from GitHub Releases
1. Download the latest **`PixelSlim_1.0.0_universal.dmg`** from [Releases](https://github.com/zeospec/PixelSlim/releases/latest).
2. Double-click the `.dmg` file.
3. Drag **PixelSlim** into your **Applications** folder.
4. Open **PixelSlim** from Launchpad or Spotlight.

> [!TIP]
> **macOS Gatekeeper Notice**: Because PixelSlim is distributed directly as an independent open-source project via GitHub, on the very first launch macOS may show an unverified developer prompt. Simply right-click (or Control-click) `PixelSlim.app`, select **Open**, and click **Open** in the dialog.

---

## 💡 Usage & Workflow

1. **Choose Target Format**: Select from `Original`, `WebP`, `PNG`, `JPEG`, or `SVG` in the top format bar.
2. **Select Compression Mode**:
   - **Smart**: Automatically balances size vs quality (recommended).
   - **Target Size**: Enter target KB or MB limit for strict file constraints.
   - **Manual**: Adjust custom quality slider (10% to 100%), lossless mode, and dimension caps.
3. **Queue Images**:
   - Drag and drop files or folders into the window.
   - Or press <kbd>Cmd</kbd> + <kbd>O</kbd> to open the native file dialog.
   - Or press <kbd>Cmd</kbd> + <kbd>V</kbd> to paste directly from your clipboard.
4. **Process & Save**: Click **Compress Images** to run batch processing at native Rust speed.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Cmd</kbd> + <kbd>V</kbd> | Paste image / screenshot from clipboard into staging queue |
| <kbd>Cmd</kbd> + <kbd>O</kbd> | Open native file chooser dialog |
| <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd> | Open native directory chooser dialog |
| <kbd>Cmd</kbd> + <kbd>R</kbd> | Reveal the latest processed file in macOS Finder |
| <kbd>Cmd</kbd> + <kbd>K</kbd> | Clear the completed queue |
| <kbd>Cmd</kbd> + <kbd>,</kbd> | Open Preferences modal |
| <kbd>Esc</kbd> | Close Preferences modal |

---

## 🛠️ Developer Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust Toolchain](https://www.rust-lang.org/tools/install) (2021 edition)
- macOS Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```

### Development Setup
```bash
# Clone the repository
git clone https://github.com/zeospec/PixelSlim.git
cd PixelSlim

# Install frontend dependencies
npm install

# Run in development mode with live reload
npm run dev
```

### Production Build

**Universal Release (Intel + Apple Silicon):**
```bash
npm run build:universal
```
Build artifacts will be located in:
- **DMG Installer**: `src-tauri/target/universal-apple-darwin/release/bundle/dmg/PixelSlim_1.0.0_universal.dmg`
- **Application Bundle**: `src-tauri/target/universal-apple-darwin/release/bundle/macos/PixelSlim.app`

**Architecture-Specific Release:**
```bash
npm run build
```

---

## 🏗️ Architecture

```
PixelSlim/
├── assets/                  # High-resolution brand assets & icon sets
│   ├── logo.png             # Application logo
│   ├── logo-original.png    # Master source logo
│   ├── icon.icns            # macOS multi-resolution icon bundle
│   └── icon.png             # Standalone 512x512 icon
├── src/                     # Frontend UI Layer (Vanilla JS & CSS)
│   ├── index.html           # Structure, modals, and settings
│   ├── js/
│   │   ├── app.js           # UI logic, state management, updater
│   │   └── tauri-bridge.js  # IPC bridge between WebKit and Rust
│   └── styles/
│       └── app.css          # Design system, themes & animations
└── src-tauri/               # Native Rust Backend Layer
    ├── Cargo.toml           # Rust dependencies & optimization profiles
    ├── tauri.conf.json      # Tauri application & window configuration
    └── src/
        ├── lib.rs           # IPC commands & OS integrations
        ├── main.rs          # Application entry point
        └── processor.rs     # Image processing engines (imagequant, oxipng, webp)
```

---

## 🤝 Contributing

Contributions make the open-source community an inspiring place to learn, create, and build. Any contributions you make are **greatly appreciated**!

1. **Fork the Project**
2. **Create your Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your Changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the Branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

Please ensure code compiles cleanly (`cargo check --manifest-path src-tauri/Cargo.toml` and `npm run dev`) before opening a PR.

---

## 🐛 Feedback & Bug Reports

Found a bug or have a feature idea?
- Open an issue on the [GitHub Issues](https://github.com/zeospec/PixelSlim/issues) tracker.
- Check existing issues before opening duplicate requests.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for full details.

---

## 👨‍💻 Author & Credits

Crafted with ⚡ by **[ZeoSpec](https://zeospec.com/)** and the AI Agents (ft. Gemini).

- **Website**: [https://zeospec.com/](https://zeospec.com/)
- **GitHub**: [@zeospec](https://github.com/zeospec)
- **Repository**: [https://github.com/zeospec/PixelSlim](https://github.com/zeospec/PixelSlim)

<div align="center">
  <sub>If you find PixelSlim useful, please consider giving it a ⭐️ on GitHub!</sub>
</div>
