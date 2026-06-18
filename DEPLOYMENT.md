# Deployment & Setup Guide

Manual steps for iGN to get Online University (multi-user, Google sign-in) running
locally and deployed to Fly.io. Run these yourself — they need interactive logins
(Google, Fly) and your own secrets.

App is **invite-only**: only emails in `ALLOWED_EMAILS` can sign in. SQLite is
**single-writer**, so the Fly app must stay on **one machine**.

---

## 1. Google OAuth (Google Cloud Console)

1. Console → **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs** (add both):
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://<your-app>.fly.dev/api/auth/callback/google` (production — use your real domain)
4. Save the **Client ID** and **Client secret**.

> If the OAuth consent screen is in "Testing", add your Google account(s) as test users.

---

## 2. Local dev

Create `.env.local` (copy from `.env.example`):

```bash
ANTHROPIC_API_KEY=sk-ant-...
AUTH_SECRET=            # generate: npx auth secret   (or: openssl rand -base64 33)
AUTH_GOOGLE_ID=         # from step 1
AUTH_GOOGLE_SECRET=     # from step 1
ALLOWED_EMAILS=you@gmail.com          # comma-separated allowlist
OWNER_EMAIL=you@gmail.com             # adopts existing (NULL-owned) content on login
# AUTH_URL=            # not needed in dev
```

Run and verify:

```bash
npm run dev
```

- Visit `http://localhost:3000` → redirected to `/login` → "Sign in with Google".
- After sign-in as `OWNER_EMAIL`, your existing 7 classes appear (owner backfill).
- An email NOT in `ALLOWED_EMAILS` is rejected at sign-in.
- (Isolation) a second allowed account starts empty and 404s on your class/lecture ids.

---

## 3. Deploy to Fly.io

Uses the existing `Dockerfile` + `fly.toml` (app `online-university`, region `iad`,
volume `university_data` mounted at `/data`, `DB_DIR=/data`).

```bash
fly auth login
fly launch --no-deploy                       # reuses fly.toml; don't overwrite it
fly volumes create university_data --region iad --size 1

# Secrets (single command):
fly secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  AUTH_SECRET=... \
  AUTH_GOOGLE_ID=... \
  AUTH_GOOGLE_SECRET=... \
  ALLOWED_EMAILS=you@gmail.com \
  OWNER_EMAIL=you@gmail.com \
  AUTH_URL=https://<your-app>.fly.dev

fly deploy
fly scale count 1            # SQLite single-writer: never run more than 1 machine
```

A fresh volume auto-creates an empty, seeded-empty DB on first boot.

---

## 4. Migrate existing local content (optional, one-time)

The DB runs in **WAL mode**, so copy it WAL-safely. Order doesn't matter for the
owner-claim (it runs on every `OWNER_EMAIL` login, idempotently).

```bash
# 1. Checkpoint locally so all data lands in the main file
sqlite3 data/university.db "PRAGMA wal_checkpoint(TRUNCATE);"

# 2. Copy onto the volume (interactive SFTP shell)
fly ssh sftp shell
#   > put data/university.db /data/university.db
#   (then remove any stale /data/university.db-wal and -shm via: fly ssh console → rm)

# 3. Restart so the migration runs (adds schools.user_id = NULL)
fly apps restart online-university
```

Then sign in to the deployed app as `OWNER_EMAIL` → all orphaned schools (your 7
classes + everything under them) are claimed by your account.

---

## 5. iPhone / PWA verification

- Open `https://<your-app>.fly.dev` on the iPhone → sign in with Google.
- Open a cards lecture → **reel mode**: vertical swipe between cards, tap to reveal,
  Finish marks complete, completion routes to next / deepen.
- **Add to Home Screen** → launches full-screen (standalone) → reel + agent/teacher
  chat all work end-to-end.
- Confirm cross-user isolation on the live app (second account sees nothing of yours).
