# Manual Inputs Checklist (Run At End)

1. Configure production database secrets in CI/Vercel:
- `DATABASE_URL`
- `DIRECT_URL`

2. Configure session/auth secrets in CI/Vercel:
- `SESSION_SECRET`

3. Run Prisma production migration on target environment:
- `npx prisma migrate deploy`

4. Install Playwright browser binaries before e2e:
- `npx playwright install`

5. Run e2e suite in target env:
- `npm run test:e2e`
