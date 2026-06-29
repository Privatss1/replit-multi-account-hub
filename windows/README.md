# Replit Hub — Windows Desktop App

A local desktop application for managing multiple Replit accounts, with all data stored on your computer.

## Quick Start

### Option 1: One-click launch (browser mode)
1. Install [Node.js 20+](https://nodejs.org/en/download)
2. Double-click `setup.bat` (first time only)
3. Double-click `start-browser.bat`
4. App opens at http://localhost:7891 in your browser

### Option 2: Desktop app (Electron window)
1. Install [Node.js 20+](https://nodejs.org/en/download)
2. Double-click `setup.bat` (first time only)
3. Double-click `start.bat`

### Option 3: Build a proper .exe installer
1. Complete steps 1-2 above
2. Double-click `build-installer.bat`
3. Find the installer in `dist/`

---

## Where data is stored

All your data is saved locally on your computer:

```
C:\Users\YOUR_NAME\AppData\Roaming\ReplitHub\
  database.db       ← All your accounts, projects, memories, skills
  uploads\          ← Uploaded files and images
```

Data persists between sessions. Nothing is sent to any cloud service.

---

## Connecting Replit Accounts

1. Open the app → go to **Accounts**
2. Click **New Account**
3. Fill in:
   - **Name**: anything (e.g. "Main Account")
   - **Username**: your Replit username
   - **Token**: your `connect.sid` cookie from Replit

### How to get your connect.sid token:
1. Open [replit.com](https://replit.com) and log in
2. Press **F12** → **Application** tab → **Cookies** → `https://replit.com`
3. Find `connect.sid` → copy the value
4. Paste it into Replit Hub as the token

> **Note**: Each account needs its own browser login. Use different browsers or browser profiles for each account.

---

## Features

- **Dashboard** — Overview of all accounts with free-tier limit bars
- **Accounts** — Manage all Replit accounts, verify tokens, track limits
- **Projects** — Create projects, link multiple accounts to each
- **Memory** — Per-project context that persists between sessions
- **Skills** — Reusable prompt templates
- **Knowledge Base** — Notes, documents, URLs, code snippets
- **Chat** — Conversations with voice input and file upload
- **API Keys** — Secure storage of OpenAI, Anthropic and other API keys

---

## Limit Monitoring

Since all accounts are on Replit Free tier:
- Yellow bar = 80%+ of limit used
- Red indicator = 100% (limit reached)
- Dashboard shows all accounts at a glance
- Activity feed logs when limits approach

---

## Requirements

- Windows 10 or later (64-bit)
- Node.js 20+ ([download](https://nodejs.org/en/download))
- Internet connection (for Replit API calls only)

---

## Troubleshooting

**"npm install failed"** — Check internet connection or run as Administrator

**"better-sqlite3 error"** — Run `npm install --build-from-source better-sqlite3`

**"Port 7891 already in use"** — Change `PORT=7891` in `start-browser.bat`

**App not opening** — Try `start-browser.bat` instead of `start.bat`
