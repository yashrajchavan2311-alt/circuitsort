# ♻️ CircuitSort

![CircuitSort logo](public/circuitsort-logo.svg)

**Give old electronics a smarter next stop.** CircuitSort is a portfolio demo that identifies common e-waste parts from an image or webcam frame, highlights detections, estimates material composition, and animates a route to a sorting bin.

Built with care by **Yashraj Chavan**.

> ⚠️ The robotic arm is a visual simulation. This project does not control physical sorting hardware. AI image analysis sends images to the configured Google Gemini API; avoid uploading private or sensitive images.

## ✨ What you can do

- Upload or drag in a PNG, JPG, JPEG, or WebP image and inspect detection boxes and confidence scores.
- Use a webcam for repeated frame analysis (about every 1.8 seconds). Camera access requires browser permission and a secure context such as `localhost` or HTTPS.
- Review material estimates, category counts, and a session sort-event log.
- Watch the simulated servo route detections to one of six bins.
- Switch between English and Hindi, and between light and dark themes.
- Try the demo account from the Account tab.

The inventory and event log live in page memory and reset when the page is refreshed. The language choice is saved in browser local storage.

### Supported categories and simulated bins

| Bin | Categories |
| --- | --- |
| 1 | Capacitors |
| 2 | Resistors and connectors |
| 3 | PCBs and transformers |
| 4 | Battery modules |
| 5 | Consumer gadgets and cables |
| 6 | IC chips and heat sinks |

The detector recognizes capacitors, resistors, PCBs, battery modules, consumer gadgets, IC chips, connectors, cables, heat sinks, and transformers. Material percentages are illustrative estimates, not a recycling or safety certification.

## 🚀 Run locally

### Requirements

- [Bun](https://bun.sh/) (the project lockfile and deployment config use Bun)
- A Google Gemini API key for image analysis. Create one in [Google AI Studio](https://aistudio.google.com/app/apikey).

### Install and configure

```bash
git clone https://github.com/yashrajchavan2311-alt/circuitsort.git
cd circuitsort
bun install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux, use `cp .env.example .env` instead. Add your Gemini key to `.env` and replace the NextAuth secret with a long, random value:

```env
DATABASE_URL="file:./db/custom.db"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="your-google-gemini-api-key"
```

The API also accepts `GOOGLE_API_KEY` instead of `GEMINI_API_KEY`. Keep `.env` private; never commit real API keys or secrets. The checked-in `.env.example` is only a template and does not include the Gemini key.

Set up the local Prisma database and start the development server:

```bash
bun run db:generate
bun run db:push
bun run dev
```

Open **http://localhost:3000**. The `db:push` script accepts potentially data-losing schema changes; use it with a disposable development database and back up any database you care about.

Without a Gemini API key, the site can load, but image analysis will fail.

## 🧪 Try the demo account

Open the **Account** tab and use:

- **Email:** `demo@circuitsort.app`
- **Password:** `circuitsort1234`

This is hard-coded demo authentication for a portfolio experience, not a production user system. Do not deploy it as-is for real users.

## 🛠️ Useful commands

| Command | What it does |
| --- | --- |
| `bun run dev` | Start the local development server |
| `bun run build` | Build the Next.js app |
| `bun run start` | Start the standalone production build |
| `bun run lint` | Run ESLint |
| `bun run db:generate` | Generate the Prisma client |
| `bun run db:push` | Sync the Prisma schema to the configured database |
| `bun run db:migrate` | Run Prisma migrations |
| `bun run db:reset` | Reset the Prisma database; this is destructive |

## 🧭 Project map

```text
src/
├── app/
│   ├── api/analyze-image/       # Gemini image-analysis endpoint
│   ├── api/auth/[...nextauth]/ # Demo credentials auth handler
│   ├── page.tsx                # Main sorting, inventory, and account views
│   └── layout.tsx              # App shell and global providers
├── components/ewaste/          # Sorting, inventory, account, and UI panels
├── hooks/                      # Shared React hooks
└── lib/
    ├── auth.ts                 # Demo credentials and NextAuth options
    └── ewaste/                 # Detection types, routing, and translations
prisma/schema.prisma            # SQLite Prisma schema
public/                         # Logos and static assets
```

### Image-analysis API

`POST /api/analyze-image` accepts `multipart/form-data` with an image in the `file` field. It returns detections with category, confidence, image-relative bounding box, illustrative material estimates, bin number, and processing time. The endpoint uses the Google GenAI SDK and the configured Gemini API key.

## ☁️ Deployment notes

The repository includes Vercel settings for a Bun-based Next.js build. Configure `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_URL`, and `GEMINI_API_KEY` in the deployment environment. The included SQLite setup is intended for local development; serverless deployments need a durable database configuration. Replace the demo authentication before exposing the app to real users.

## 🧱 Built with

Next.js App Router, React, TypeScript, Tailwind CSS, Radix UI/shadcn-style components, Prisma with SQLite, NextAuth, and the Google GenAI SDK.
