# Contributing to Blobby

Thanks for your interest in contributing! This guide covers the basics.

## Getting Set Up

1. Fork the repository and clone your fork.
2. `npm install`
3. Copy `.env.example` to `.env` and add your Groq API key.
4. `npm run dev` and open http://localhost:3000.

## Project Layout

- `src/server.js` — Express server, system prompt, LangChain chain, `/api/chat` and `/api/chat/clear` endpoints.
- `src/index.html` — the Three.js avatar scene, chat UI, and all styles.
- `src/chat.js` — frontend chat client (fetch calls, voice input, mood handling, settings).

## Guidelines

- Keep the code dependency-light — prefer vanilla JS/CSS and what's already in `package.json`.
- Match the existing code style (2-space indent in `src/server.js`, compact vanilla JS in the frontend).
- The system prompt in `src/server.js` is the product's personality — change it carefully and test conversations after edits.
- Don't commit `.env` or API keys. Use `.env.example` for new variables.
- Don't add emojis to code or comments unless the surrounding code already uses them.
- Keep responses fast — the backend is meant to feel snappy; avoid heavy synchronous work in request handlers.

## Reporting Issues

Use the issue templates when opening bugs or feature requests. Include:

- Steps to reproduce (for bugs)
- Browser + Node version
- Relevant console output

## Pull Requests

1. Create a branch off `main` (`git checkout -b feature/my-change`).
2. Make focused changes — one feature/fix per PR.
3. Test locally (`npm run dev`) and describe what you tested in the PR description.
4. Fill out the pull request template.

## Code of Conduct

Please be respectful and constructive. Harassment of any kind will not be tolerated.
