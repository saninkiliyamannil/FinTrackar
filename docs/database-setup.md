# MySQL + Prisma Setup Guide

## 1. Create Database (MySQL)

Run in MySQL:

```sql
CREATE DATABASE fintrackar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 2. Environment Variables

Set in `.env`:

```env
DATABASE_URL="mysql://root:password@127.0.0.1:3306/fintrackar"
```

## 3. Prisma Client

```bash
npx prisma generate
```

## 4. Create Initial Migration

```bash
npx prisma migrate dev --name init_mysql
```

## 5. Production Deploy

```bash
npx prisma migrate deploy
```

## 6. If Schema Drift Happens

```bash
npx prisma db push
```

Use `db push` only for non-production or recovery workflows.