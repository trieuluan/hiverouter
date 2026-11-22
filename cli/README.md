# HiveRouter

**AI Router & Token Saver — Forked from 9Router for HiveDeck.**

Connect AI coding tools (Claude Code, Codex CLI, Cursor, Antigravity, Copilot, Gemini, OpenCode, Cline...) to 40+ AI providers & 100+ models through a unified OpenAI/Anthropic/Responses-compatible local proxy.

[![npm](https://img.shields.io/npm/v/@trieuluan/hiverouter.svg)](https://www.npmjs.com/package/@trieuluan/hiverouter)
[![GHCR](https://img.shields.io/badge/GHCR-trieuluan%2Fhiverouter-blue?logo=github)](https://github.com/trieuluan/hiverouter/pkgs/container/hiverouter)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/trieuluan/hiverouter/blob/master/LICENSE)

[📖 GitHub Repository](https://github.com/trieuluan/hiverouter) • [🐳 Docker Guide](https://github.com/trieuluan/hiverouter/blob/master/DOCKER.md) • [📝 Changelog](https://github.com/trieuluan/hiverouter/blob/master/CHANGELOG.md)

---

## ✨ What HiveRouter Adds

Built on top of 9Router (`0.5.119+`) with enhancements tailored for multi-agent workflows and HiveDeck:

- **Native Tool-Output Image Normalization**: Lifts `input_image` / `image` blocks out of Responses `function_call_output` and Claude `tool_result` into user-role vision parts, preventing translators from stringifying base64 screenshots into ~600k text tokens.
- **Antigravity Claude Image Support**: Translates top-level `image` content blocks into Gemini `inlineData` parts directly in `openai-to-gemini.js`.
- **MCP Namespace Tool Flattening** *(upstream PR #5799)*: Unpacks Codex CLI `namespace` tool objects for non-OpenAI providers.
- **Resolved Model & Context Window Headers** *(upstream PR #5802)*: Exposes `x-9router-model` and `x-9router-context-window` headers on responses so clients and HiveDeck track the real context window.

---

## ⚡ Quick Start

### npm

```bash
npm install -g @trieuluan/hiverouter
hiverouter
```

### Docker

```bash
docker run -d \
  -p 20128:20128 \
  -v "$HOME/.9router:/app/data" \
  -e DATA_DIR=/app/data \
  --name hiverouter \
  chaybo2006/hiverouter:latest
```

Open the dashboard at `http://localhost:20128`.

> **Data compatibility**: By default, HiveRouter reads/writes `~/.9router/` (or `$DATA_DIR` if set) so existing `data.sqlite` databases and provider credentials migrate seamlessly.
