## Getting started

Requirements: Node.js `>=24.22.1` (or `^22.23.4`), pnpm `^12`, and a PostgreSQL database (a Neon `dev` branch works).

```bash
pnpm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Edit `.env`:

- `DATABASE_URL`: connection string for a **development** database, never production.
- `PAYLOAD_SECRET`: a random string of at least 32 characters. Generate one with:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Then apply the migrations and start the app:

```bash
pnpm payload migrate
pnpm dev
```

Open `http://localhost:3000/admin` and create the first user.

Useful checks: `pnpm lint`, `pnpm typecheck`, `pnpm build`.