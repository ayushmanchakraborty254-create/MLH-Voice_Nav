# 🌐 VoiceDOM Universal Browser Extension (Chrome / Edge / Brave)

Run multilingual voice navigation, form autopilot, and screen reading on **ANY** website on the internet (Amazon, Wikipedia, Government Portals, University Registrations, etc.).

---

## 🚀 How to Install & Run (Step-by-Step)

### Step 1: Open Chrome Extensions
1. Open Google Chrome, Brave, or Microsoft Edge.
2. In the URL bar, type:
   ```
   chrome://extensions
   ```
   and press **Enter**.

### Step 2: Enable Developer Mode
- In the top right corner of the Extensions page, toggle **Developer mode** to **ON**.

### Step 3: Load Unpacked Extension
1. Click the **"Load unpacked"** button at the top left.
2. In the folder picker window, navigate to this project and select the **`extension`** folder inside `packages`:
   ```
   Site_Reader/packages/extension
   ```
   *(Full path: `c:\Users\ARYAN SAMADDER\Desktop\VSCode\Projects\SIH_voice_Nav\Site_Reader\packages\extension`)*
3. Click **Select Folder**.

---

## 🎯 How to Use on Any Website

1. Open **any website** in your browser (e.g. `https://amazon.in`, `https://wikipedia.org`, `https://goaps.iitm.ac.in`).
2. You will see the **VoiceDOM Floating Radar Bar** in the bottom-right corner.
3. You can interact in two ways:
   - **🎙️ Voice**: Click **`Speak`** and speak in English, Bengali, Marathi, or Hindi.
   - **⌨️ Typed Command**: Type your command into the input box and press **`Enter`**.

### 💡 Example Commands:
- **Button Clicks & Navigation**: *"Apply now"*, *"Open important dates"*, *"Add to cart"*, *"Click login"*
- **Form Autopilot**: *"My name is Aryan Samadder, email aryan@gmail.com, city Pune"*
- **Visual Finder & Smooth Scroll**: *"Where is the continue button"*, *"Find the checkbox"*
- **Screen Reader**: *"Read instructions"*, *"Read page"* (or click **`🔊 Read`**)
- **Checkboxes & Terms**: *"I agree to terms"*, *"I have read and understood all instructions"*

---

## ⚙️ Extension Architecture
- `manifest.json`: Manifest V3 configuration with `activeTab` and `scripting` permissions.
- `content.js`: Autonomous DOM scanner, React-safe checkbox toggler, multi-event clicker, and Qwen 2.5/3.8 perception engine.
- `background.js`: Chrome service worker.
- `popup.html` & `popup.js`: Quick toggle and language selector.
