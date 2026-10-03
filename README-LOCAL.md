# CircuitSort — Run on Your Desktop

A complete guide to run CircuitSort locally on your own computer.
When running locally, the URL will be **`http://localhost:3000`** — no "Zai" or "space-z.ai" in the URL.

---

## Prerequisites

You need **one** of these installed on your computer:

### Option A: Node.js (most common)
1. Go to https://nodejs.org
2. Download and install **Node.js 20+** (the LTS version)
3. Verify installation by opening a terminal and running:
   ```bash
   node --version    # should print v20.x.x or higher
   npm --version     # should print 10.x.x or higher
   ```

### Option B: Bun (faster, recommended if you want speed)
1. Go to https://bun.sh
2. Follow the install instructions for your OS
3. Verify:
   ```bash
   bun --version    # should print 1.x.x
   ```

---

## Step 1: Download and Extract

1. Download the `circuitsort.zip` (or `circuitsort.tar.gz`) file
2. Extract it to a folder on your desktop, e.g.:
   - **Windows**: `C:\Users\YourName\Desktop\circuitsort`
   - **Mac/Linux**: `~/Desktop/circuitsort`

---

## Step 2: Install Dependencies

Open a terminal **in the extracted folder** and run:

```bash
# If using Node.js + npm:
npm install

# If using Bun (faster):
bun install
```

This will download all required packages (~1-2 minutes). Wait for it to finish.

---

## Step 3: Set Up the AI Vision API Key

The e-waste detection uses the **Z.ai Vision Language Model** (GLM-4V). You need a free API key:

### Get Your Free API Key
1. Go to **https://z.ai** (or https://chatglm.cn for China)
2. Sign up for a free account
3. Navigate to **API Keys** / **Developer Console**
4. Create a new API key and copy it

### Configure the SDK
1. In the project root, copy the example config:
   ```bash
   cp .z-ai-config.example .z-ai-config
   ```
2. Open `.z-ai-config` in a text editor
3. Replace `YOUR_ZAI_API_KEY_HERE` with your actual API key:
   ```json
   {
     "baseUrl": "https://api.z.ai/api/paas/v4",
     "apiKey": "your-actual-api-key-here",
     "chatId": "",
     "userId": ""
   }
   ```
4. Save the file

> ⚠️ **Without this step, the app will still load, but image analysis will fail with an API error.**

---

## Step 4: Set Up Environment Variables

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` in a text editor
3. Generate a random secret for NextAuth (any 32+ character string):
   - **Mac/Linux**: Run `openssl rand -base64 32` in terminal, paste the output
   - **Windows**: Just type any random 32+ character string with letters and numbers
4. Update the file:
   ```env
   DATABASE_URL="file:./db/custom.db"
   NEXTAUTH_SECRET="your-random-32-char-string-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```
5. Save the file

---

## Step 5: Set Up the Database

Run this command to create the local SQLite database:

```bash
# If using npm:
npx prisma db push

# If using bun:
bun run db:push
```

You should see "Your database is now in sync with your Prisma schema."

---

## Step 6: Start the App

```bash
# If using npm:
npm run dev

# If using bun:
bun run dev
```

You'll see output like:
```
✓ Ready in 1.2s
○ Compiling / ...
```

---

## Step 7: Open in Your Browser

Open your web browser and go to:

### **http://localhost:3000**

That's it! CircuitSort is now running on your desktop. The URL is clean — no "Zai", no "space-z.ai".

---

## Demo Login Credentials
- **Email:** `demo@circuitsort.app`
- **Password:** `circuitsort1234`

---

## Troubleshooting

### "command not found: node" or "command not found: npm"
→ Node.js is not installed or not in your PATH. Reinstall from https://nodejs.org

### "Error: Cannot find module 'z-ai-web-dev-sdk'"
→ You skipped `npm install` (or `bun install`). Run it in the project folder.

### Image analysis fails with "API error" or "401 Unauthorized"
→ Your `.z-ai-config` file is missing or the API key is invalid. Re-check Step 3.

### "Port 3000 is already in use"
→ Another app is using port 3000. Either close it, or start CircuitSort on a different port:
```bash
npx next dev -p 3001    # then open http://localhost:3001
```

### Prisma database errors
→ Run `npx prisma db push --accept-data-loss` to reset the database

### Camera not working in webcam mode
→ Your browser will ask for camera permission. Click "Allow". Also, `localhost` is required for camera access — don't use `127.0.0.1`.

---

## What's Included in This Package

```
circuitsort/
├── src/                          # All source code
│   ├── app/                      # Next.js app router
│   │   ├── api/analyze-image/    # VLM detection endpoint
│   │   ├── api/auth/             # NextAuth handler
│   │   ├── globals.css           # CircuitSort theme
│   │   ├── layout.tsx            # Root layout + providers
│   │   └── page.tsx              # Main dashboard
│   ├── components/ewaste/        # All UI components
│   ├── hooks/                    # Custom React hooks
│   └── lib/                      # Auth config, types, translations
├── public/                       # Logo + static assets
├── prisma/                       # Database schema
├── package.json                  # Dependencies
├── .env.example                  # Template for .env
├── .z-ai-config.example          # Template for AI config
├── vercel.json                   # Vercel deployment config
└── README-LOCAL.md               # This file
```

---

## Deploy to the Internet (Optional)

When you're ready to share your app with the world (instead of just `localhost`):

### Vercel (free, recommended)
1. Push this project to a GitHub repo named `circuitsort`
2. Go to https://vercel.com → sign in with GitHub
3. Import the repo → click "Deploy"
4. Get your URL: **`circuitsort.vercel.app`** (no "Zai"!)
5. In Vercel Project Settings → Environment Variables, add:
   - `NEXTAUTH_SECRET` = your random string
   - `NEXTAUTH_URL` = `https://circuitsort.vercel.app`
6. Also add your `.z-ai-config` as a file in the Vercel dashboard, OR set the API key as an env var

### Custom domain
Buy a domain like `circuitsort.com` (~$10/year from Namecheap/GoDaddy) and connect it in Vercel Project Settings → Domains.

---

## Tech Stack
- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** components
- **z-ai-web-dev-sdk** (GLM-4V vision model for e-waste detection)
- **NextAuth.js** (credentials authentication)
- **next-themes** (dark/light mode)
- **Prisma** + **SQLite** (database)
- Custom i18n (English + Hindi)

---

## Need Help?
If something doesn't work, the most common issues are:
1. Missing API key in `.z-ai-config` → re-check Step 3
2. Missing `.env` file → re-check Step 4
3. Database not set up → re-check Step 5

Good luck! 🚀
