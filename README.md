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

## Sample development content

To populate a **development database** with clearly fictional draft articles,
categories, tags, and an author:

```bash
pnpm seed:sample
```

Before running it, add these two values to your local `.env`:

```dotenv
SEED_SAMPLE_DATA=true
SEED_SAMPLE_DATABASE_HOST=your-development-database-host
```

The script checks that the confirmed host exactly matches `DATABASE_URL` and
requires `NODE_ENV=development`. The command does not enable sample seeding
by itself. It only creates missing records; it does not publish articles,
create users, overwrite existing content, or delete data. Never use a
production database for sample seeding.
