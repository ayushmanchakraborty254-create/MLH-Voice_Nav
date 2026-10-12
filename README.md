# 🎙️ VoiceDOM: Universal Multilingual AI Voice Navigation, Form Autopilot & Web Accessibility Suite

> **An Open-Source Web Accessibility & Agentic Automation Engine that works on ANY website on the internet.** Powered by **Whisper Large v3** and **Qwen 2.5 / 3.8-27B** via high-speed inference.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue.svg)](packages/extension)
[![Open Source AI](https://img.shields.io/badge/Open--Source%20AI-Whisper%20v3%20%2B%20Qwen%202.5-purple.svg)](SKILL.md)

---

## 🌟 What is VoiceDOM?

Instead of requiring web developers to hardcode voice commands or configure hundreds of route intents for every single page, **VoiceDOM** dynamically scans the live DOM accessibility tree on **ANY webpage** and uses an open-weight reasoning model to execute native mouse clicks, auto-fill complex multi-step forms across regional dialects, find & scroll to on-screen elements, and read page instructions out loud.

VoiceDOM comes in **3 unified formats**:
1. 🌐 **Universal Browser Extension (Manifest V3)**: Install once in Chrome/Edge/Brave and navigate *any* website (Amazon, Wikipedia, Government Portals, University Portals).
2. 📝 **Autonomous VoiceForm Autopilot**: 1-sentence continuous multi-field entity extraction and filling with conversational memory.
3. 📦 **1-Line Drop-in Web SDK**: `<script src="voicedom.js"></script>` or React widget for web developers.

---

## 🚀 Quickstart: Running the Browser Extension

### 1️⃣ Open Chrome Extensions
1. Open Google Chrome, Brave, or Microsoft Edge.
2. In your address bar, go to:
   ```
   chrome://extensions
   ```

### 2️⃣ Turn On Developer Mode
- Toggle the **"Developer mode"** switch in the top right corner to **ON**.

### 3️⃣ Load Unpacked Extension
1. Click the **"Load unpacked"** button in the top left.
2. Navigate inside the project and select the **`packages/extension`** folder:
   ```
   Site_Reader/packages/extension
   ```
3. Click **Select Folder**.

### 4️⃣ Open Any Website & Start Navigating!
Open any website (e.g. `https://amazon.in`, `https://wikipedia.org`, `https://goaps.iitm.ac.in`) — the VoiceDOM floating bar will appear in the bottom right corner ready for voice or typed commands!

---

## 🎬 Running the Live Interactive Showcase Demo

VoiceDOM includes a pre-built 3-in-1 interactive showcase (E-Commerce Store, Multi-Step KYC Form, and Agritech Portal):

```powershell
cd Site_Reader
npx serve demo
```
Open `http://localhost:3000` (or `http://localhost:5000`) in your browser.

---

## 🔑 Environment Variables & Configuration

Copy `.env.example` to `.env` to configure your API keys and model parameters:

```bash
cp .env.example .env
```

| Variable | Default | Description |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | *(Built-in Demo Key)* | Groq API Key for zero-latency open-weight model inference |
| `GROQ_MODEL` | `qwen/qwen3.8-27b` | Open-weight reasoning model for DOM perception |
| `WHISPER_MODEL` | `whisper-large-v3` | Speech-to-Text model for regional Indic dialect recognition |
| `DEFAULT_LANGUAGE` | `en` | Default UI language (`en`, `bn`, `mr`, `hi`) |
| `ENABLE_RADAR_HIGHLIGHT` | `true` | Visual glowing emerald radar pulse on targeted elements |

---

## 🗣️ Supported Commands & Features

| Feature | Example Commands (Voice or Typed) | Action Performed |
| :--- | :--- | :--- |
| **Navigation & Clicks** | *"Apply now"*, *"Important dates"*, *"Add wheat to cart"* | Finds matching button/link and triggers native click |
| **Visual Finder ("Where is X?")** | *"Where is the continue button"*, *"Find the checkbox"* | Smoothly scrolls to target element and pins radar badge |
| **Multi-Turn Form Autopilot** | *"My name is Aryan Samadder, email is aryan@gmail.com"* | Auto-splits and fills first name, last name, and email |
| **Checkbox / Terms Agreement** | *"I agree to terms"*, *"I have read and understood instructions"* | Toggles React-safe checkbox state |
| **Universal Screen Reader** | *"Read page"*, *"Read instructions"*, or click **`🔊 Read`** | Reads out page/modal text using native Speech Synthesis |
| **Multilingual Dialects** | *"আমার নাম আর্যন"*, *"माझे नाव आर्यन आहे"* | Native entity extraction across English, Bengali, Marathi, Hindi |

---

## 📂 Project Architecture

```
Site_Reader/
├── packages/
│   ├── core/                     # 🧠 AI DOM Perception & Action Execution Engine
│   │   ├── src/
│   │   │   ├── types.ts          # Action contracts & DOM schemas
│   │   │   ├── domScanner.ts     # Z-index modal & interactive element perception
│   │   │   ├── actionExecutor.ts # Synthetic event bubbling & radar pin animator
│   │   │   ├── speechPipeline.ts # Continuous audio streaming & debounce buffer
│   │   │   ├── aiEngine.ts       # Qwen 2.5/3.8 + Whisper reasoning kernel
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── sdk/                      # 📦 1-Line Drop-in Web SDK (<script> & React)
│   │   ├── src/
│   │   │   ├── widget.ts         # Glassmorphic floating AI Voice Orb
│   │   │   └── index.ts          # Standalone CDN bundle entry
│   │   └── package.json
│   │
│   └── extension/                # 🌐 Universal Browser Extension (Manifest V3)
│       ├── manifest.json         # Chrome Extension Manifest V3 configuration
│       ├── background.js         # Service worker
│       ├── popup.html            # Extension popup UI
│       ├── popup.js              # Popup control scripts
│       ├── content.js            # Injected agentic AI content script
│       └── README.md             # Extension installation guide
│
├── demo/                         # 🎬 Multi-Tab Interactive Pitch Showcase
│   ├── index.html                # E-Commerce, KYC Form & Agritech tabs
│   └── style.css                 # Modern dark glassmorphism styling
│
├── .env.example                  # Environment configuration template
├── SKILL.md                      # Agent Skill Open Standard Specification
├── LICENSE                       # MIT License
├── package.json                  # Standalone monorepo manifest
└── README.md                     # Master Documentation
```

---

## ⚖️ License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.
