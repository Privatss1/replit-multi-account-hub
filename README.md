# Replit Multi-Account Hub

  A local web dashboard for managing and orchestrating multiple Replit accounts — with memory, skills, knowledge base, voice input, and free-tier limit monitoring.

  ## Windows Desktop App

  See the `windows/` folder for the standalone Windows application with no cloud dependencies.
  All data is stored locally in `%APPDATA%\ReplitHub\`.

  ## Tech Stack
  - React 18 + Vite + Tailwind CSS + shadcn/ui
  - Express 5 + PostgreSQL + Drizzle ORM (cloud version)
  - sql.js SQLite (Windows desktop version — no compilation needed)
  