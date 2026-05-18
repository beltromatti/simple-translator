<p align="center">
  <img src="public/simple-translator-logo.svg" alt="Simple Translator logo" width="900">
</p>

# Simple Translator

<p align="center">
  <strong>A focused Italian-Spanish translator built by Mattia Beltrami, Computer Engineering student at Politecnico di Milano.</strong>
</p>

<p align="center">
  <a href="https://github.com/beltromatti/simple-translator"><img alt="GitHub repo" src="https://img.shields.io/badge/GitHub-simple--translator-111827?style=for-the-badge&logo=github"></a>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-0F172A?style=for-the-badge&logo=nextdotjs">
  <img alt="Gemini" src="https://img.shields.io/badge/Gemini-3.1_Flash_Lite-1F2937?style=for-the-badge&logo=google">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Ready-0B1220?style=for-the-badge&logo=typescript">
</p>

## What It Is

Simple Translator is a small, polished web app for translating between Italian and Spanish with practical context. It does not try to be a generic dictionary or a bloated language platform. It focuses on one daily need: turning a sentence into natural language that sounds right on the other side.

The app returns the main translation, a short explanation of nuance, and up to two related idioms or expressions. That makes it useful for travel, study, work messages, and quick writing decisions where literal translation is not enough.

## Why It Exists

Italian and Spanish are close enough to feel familiar, but that closeness is exactly where mistakes become subtle. False friends, register, tone, and idioms matter. Simple Translator is designed to keep the interface calm while giving the user enough linguistic context to choose better words.

This is a personal project by **Mattia Beltrami**, built as a practical AI product rather than a demo. The goal is a translator that feels immediate, useful, and trustworthy in the small moments where language quality matters.

## Tags

`simple-translator` `italian` `spanish` `translation` `gemini` `nextjs` `typescript` `ai-translator` `language-learning` `vercel`

## Core Experience

- Italian to Spanish and Spanish to Italian translation.
- Natural phrasing instead of word-by-word output.
- Short context note for tone, intent, or nuance.
- Related idioms when they genuinely help.
- Clean dark interface built for fast use.
- Server-side Gemini access so API keys are never exposed to the browser.

## Stack

| Layer | Technology |
| --- | --- |
| App | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS |
| AI | Gemini 3.1 Flash Lite |
| Hosting | Vercel |
| Runtime protection | Server-side input validation, request limits, and security headers |

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Set your server-side Gemini key:

```bash
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

`POST /api/translate`

```json
{
  "text": "Vorrei prenotare un tavolo per due persone.",
  "sourceLang": "it",
  "targetLang": "es"
}
```

Response:

```json
{
  "translation": "Me gustaría reservar una mesa para dos personas.",
  "idioms": [],
  "description": "Una frase educada y natural para hacer una reserva en un restaurante."
}
```

## Deployment

The app is designed for Vercel. Configure `GEMINI_API_KEY` as a production environment variable and connect the GitHub repository so every push to `main` triggers a public deployment.

## Author

Built by **Mattia Beltrami**<br>
Computer Engineering, **Politecnico di Milano**

Simple Translator is intentionally narrow: one translation pair, one fast interface, one useful result. That focus is what makes it practical.

## License

MIT. See [LICENSE](LICENSE).
