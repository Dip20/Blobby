import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import app from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

app.use(express.static(path.join(__dirname, '../public'), { index: 'index.html' }));

app.listen(PORT, () => {
  console.log(`Blobby is running at http://localhost:${PORT}`);
  console.log(`Using Groq model: ${process.env.GROQ_MODEL || 'openai/gpt-oss-20b'}`);
  if (!process.env.GROQ_API_KEY) console.warn('GROQ_API_KEY is not set. Chat will fail until you set it.');
});
