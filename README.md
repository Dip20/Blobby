# Blobby

Blobby is a cute, expressive 3D blob AI companion. It lives in your browser as an animated avatar that follows your pointer, reacts with different moods, and chats with you using a real LLM — powered by [Groq](https://groq.com) and LangChain.

![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

## Features

- **3D animated avatar** — a soft, squishy blob rendered with Three.js that follows your cursor, blinks, wiggles, and pokes back when clicked.
- **Mood-driven expressions** — the AI tags every reply with a mood (`happy`, `sad`, `angry`, `surprised`, `wink`, `sleepy`, `silly`, `neutral`) and Blobby's face changes to match.
- **Conversational AI** — grounded personality prompt with memory of the conversation (per-session chat history).
- **Multilingual** — responds in English, Bengali, or Hinglish automatically, matching the user's language.
- **Voice chat** — talk to Blobby using your microphone (browser Web Speech API).
- **Customizable** — rename Blobby and give it a custom personality prompt, saved in `localStorage`.
- **Session management** — each browser tab gets its own conversation; a "Clear" button resets the history.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Vanilla JS, Three.js (CDN), Web Speech API |
| Backend | Node.js, Express 4 |
| AI | Groq API (`openai/gpt-oss-20b` by default), LangChain (`@langchain/groq`, `@langchain/core`, `@langchain/community`) |
| Security | Helmet, CORS, `express-rate-limit`, request size limits |

## Project Structure

```
├── src/
│   ├── index.html    # Frontend: 3D avatar scene, chat UI, styles
│   ├── chat.js       # Frontend: chat client, voice input, session handling
│   └── server.js     # Backend: Express API, LangChain chain, prompt
├── .env.example    # Environment variable template
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 18
- A free [Groq API key](https://console.groq.com/keys)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/blobby-chat.git
cd blobby-chat

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# then edit .env and add your Groq API key
```

`.env`:

```env
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-20b
PORT=3000
```

### Run

```bash
npm run dev    # or: npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/chat` | POST | Send a chat message. Body: `{ message, sessionId?, name?, systemPrompt? }`. Returns `{ reply, mood }`. Rate limited to 20 req/min. |
| `/api/chat/clear` | POST | Clear conversation history for a session. Body: `{ sessionId? }`. |

Static files (`index.html`, `chat.js`) are served from the project root.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `GROQ_API_KEY` | — | **Required.** Your Groq API key. |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Groq model to use (e.g. `llama-3.3-70b-versatile`). |
| `PORT` | `3000` | Port for the Express server. |

## Notes & Limitations

- Chat history is stored **in memory** — it resets when the server restarts and is not shared between users.
- The frontend expects the backend at `http://127.0.0.1:3000` (see `chat.js`).
- Voice chat requires a browser with the Web Speech API (Chrome/Edge recommended).

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
