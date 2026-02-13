# Manual Inputs Checklist (Run At End)

1. Configure Neon Auth frontend URLs:
- `NEXT_PUBLIC_NEON_AUTH_LOGIN_URL`
- `NEXT_PUBLIC_NEON_AUTH_LOGOUT_URL`

2. Configure Neon Auth API verification env vars:
- `NEON_AUTH_JWKS_URL`
- `NEON_AUTH_ISSUER`
- `NEON_AUTH_AUDIENCE`
- Optional: `NEON_AUTH_COOKIE_NAME`, `NEON_AUTH_USER_ID_CLAIM`

3. Configure production database secrets in CI/Vercel:
- `DATABASE_URL`
- `DIRECT_URL`

4. Run Prisma production migration on target environment:
- `npx prisma migrate deploy`

5. Install Playwright browser binaries before e2e:
- `npx playwright install`

6. Run e2e suite in target env:
- `npm run test:e2e`

7. Verify Neon Auth login/logout URLs redirect correctly in production.
