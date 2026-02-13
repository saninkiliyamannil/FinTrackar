# FinTrackar Prisma + Neon migration steps

## 1) Install/update dependencies

```bash
npm install
```

## 2) Validate schema locally

```bash
npx prisma validate
npx prisma format
```

## 3) Create migration in development

```bash
npx prisma migrate dev --name neon_auth_core_models
```

## 4) If DB drift exists, sync carefully

```bash
npx prisma db pull
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-url "$DATABASE_URL"
```

Use diff output to decide if you need a manual SQL migration, then rerun:

```bash
npx prisma migrate dev --name reconcile_drift
```

## 5) Generate client

```bash
npx prisma generate
```

## 6) Production deploy

```bash
npx prisma migrate deploy
npx prisma generate
npm run build
```

Recommended Vercel build command:

```bash
npx prisma migrate deploy && npx prisma generate && next build
```

## Required environment variables for Neon Auth route protection

- `NEON_AUTH_JWKS_URL`
- `NEON_AUTH_ISSUER`
- `NEON_AUTH_AUDIENCE`
- `NEON_AUTH_COOKIE_NAME` (optional, defaults to `neon_session`)
- `NEON_AUTH_USER_ID_CLAIM` (optional, defaults to `sub`)

## Recommended migration sequence

1. `neon_auth_core_models`
2. `transaction_indexes_and_constraints`
3. `data_backfill_neon_auth_id` (manual SQL if migrating from legacy NextAuth users)
