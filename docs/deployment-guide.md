# FinTrack Deployment Guide

Deploy the web app with Vercel and MySQL.

## Prerequisites

1. Node.js and npm
2. MySQL database
3. Vercel project linked to this repository

## Deploy Steps

1. Install dependencies:

```bash
npm install
```

2. Run migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

3. Build and test:

```bash
npm run build
npm test
```

4. Configure production environment variables in Vercel:

- `DATABASE_URL`
- `DIRECT_URL` (if used for Prisma direct connection)
- `SESSION_SECRET`

5. Deploy from `main`.

## Notes

- Authentication is handled by FinTrack's internal session flow.
