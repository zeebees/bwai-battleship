# 🚢 Battleship — Build with AI, Class 05

A 2-player online Battleship with a real back end.

**Play it:** https://bwai-battleship.netlify.app

It has player tokens, fleet checks, and you can't see the enemy's ships on screen.
It looks secure. **It isn't.** Your job: find out why → **[HACK-LAB.md](HACK-LAB.md)** 🕵️

## How it's built

| Part | Files | Runs on |
|------|-------|---------|
| Front end | `index.html` · `app.js` · `style.css` · `config.js` | your browser 💻 |
| Back end | `netlify/functions/` — `join` · `place-ships` · `fire` · `get-state` | Netlify ☁️ |
| Database | `setup.sql` — tables `games` · `players` · `ships` · `shots` | Supabase 🗃️ |

Open it in VS Code and find the answer to each hack in the code.

## Run your own copy

1. Make a Supabase project → **SQL Editor** → paste `setup.sql` → **Run**.
2. Put your project URL and **publishable** key in `config.js`.
3. Deploy to Netlify and add two environment variables:
   `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (your **secret** key — never put it in the code).

Then fix the leaks. 🔧
