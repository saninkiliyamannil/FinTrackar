# FinTrackar Website Delivery Checklist

## Scope Lock (Web First)
- [ ] Shared groups and settlement engine
- [ ] Dedicated pages for `transactions`, `budgets`, `goals`, `shared-expenses`
- [ ] Responsive and accessibility polish pass
- [ ] Full e2e coverage for core user paths
- [ ] CI/CD release hardening

## Milestone Plan
### Milestone 1: Shared Expense Domain Completion
- [ ] Add `SharedGroup` model
- [ ] Add `SharedGroupMember` model
- [ ] Add settlement tables and APIs
- [ ] Connect shared expense records to groups
- [ ] Group invite/join UX

### Milestone 2: Page Architecture Split
- [ ] Extract dashboard sections into reusable components
- [ ] Create dedicated pages with focused layouts
- [ ] Add shared table/filter/search components

### Milestone 3: UX and Design System
- [ ] Finalize component primitives (`Button`, `Input`, `Card`, `Modal`, `Toast`)
- [ ] Add loading, empty, and error states in all key pages
- [ ] Accessibility pass: labels, keyboard, focus states

### Milestone 4: Quality and Validation
- [ ] Add Playwright coverage for all core CRUD flows
- [ ] Add test fixtures/seed for MySQL test DB
- [ ] Add API contract validation tests

### Milestone 5: Release Readiness
- [ ] CI pipeline for test/build/migration checks
- [ ] Production env validation and startup checks
- [ ] Monitoring, backups, and runbook

## Definition of Done (Website)
- [ ] All API routes authenticated and validated
- [ ] All DB migrations applied and reversible
- [ ] All target flows covered by tests
- [ ] Build and tests pass in CI
- [ ] Deployment checklist and runbook completed
