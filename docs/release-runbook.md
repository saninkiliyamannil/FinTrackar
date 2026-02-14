# FinTrackar Release Runbook

## Pre-Release Checklist
- Ensure `main` is green in CI (`test-and-build`, `e2e`).
- Confirm migration state locally:
  - `npx prisma migrate status`
- Verify app compiles:
  - `npm run build`
- Verify API/unit tests:
  - `npm test`
- Verify e2e flows:
  - `npm run test:e2e`

## Database Safety
- Back up production MySQL before release.
- Keep migration SQL artifacts versioned in `prisma/migrations`.
- Use:
  - `npx prisma migrate deploy`
- Never run destructive reset in production.

## Deploy Steps
1. Merge approved PR to `main`.
2. CI runs tests/build/e2e.
3. `migrate-production` job runs `prisma migrate deploy`.
4. Deploy web app.
5. Smoke test:
   - Login/signup
   - Transactions create/edit/delete
   - Budgets/goals
   - Shared groups/settlements
   - Trends analytics

## Rollback
- App rollback:
  - Re-deploy previous known good commit.
- DB rollback:
  - Restore from latest backup or apply inverse migration script.
- Use Git tags or commit SHA checkpoints from completed milestones.

## Post-Release Monitoring
- Check API error rates.
- Check auth/session errors.
- Check migration logs.
- Verify key page routes:
  - `/transactions`
  - `/budgets`
  - `/goals`
  - `/shared-expenses`
