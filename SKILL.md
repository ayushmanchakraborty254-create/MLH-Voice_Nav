---
name: voicedom-universal-navigator
version: 1.0.0
description: Universal agent skill for autonomous multilingual DOM perception, voice-driven element interaction, and continuous multi-field form auto-filling across any web page.
author: Aryan Samadder
license: MIT
compatibility:
  frameworks: ["React", "Next.js", "Vue", "Vanilla JS", "Chrome Extensions"]
  models: ["openai/whisper-large-v3", "qwen/qwen3.8-27b", "Qwen/Qwen2.5", "meta-llama/Llama-3.3-70B-Instruct"]
---

# VoiceDOM Agent Skill Specification

An autonomous open-weight agent skill compliant with the **Agent Skill Open Standard**. It enables software agents and end users to perceive, navigate, and execute transactions on any DOM accessibility tree in English, Bengali (বাংলা), Marathi (मराठी), and Hindi (हिन्दी).

## 🧠 Core Architecture
- **Speech Engine**: OpenAI Whisper Large v3 (sub-300ms transcription).
- **Perception Kernel**: Autonomous DOM tree scanner mapping interactive nodes into structured JSON tokens.
- **Reasoning Core**: Qwen 2.5/3.8 open-weights for multilingual intent classification and dynamic slot filling.

## 🎯 Dispatched Action Primitives
1. `CLICK`: Target node selector resolution and synthetic event dispatch.
2. `TYPE`: Focused value entry with `input` and `change` event bubbling.
3. `AUTO_FILL`: Multi-field continuous entity extraction from conversational speech.
4. `SELECT_OPTION`: Fuzzy match and option index selection for `<select>` tags.
5. `SCROLL`: Viewport movement (`UP`, `DOWN`, `TOP`, `BOTTOM`).
