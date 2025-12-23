# Apostolic Graphix – Bible Commentary Dashboard

## Stack
- Next.js (App Router)
- NextAuth (Credentials)
- Prisma + Supabase Postgres
- Roles: ADMIN / CONTRIBUTOR / USER

## Key Flows
### Contributor
Draft → Submit → Admin Review → Publish/Reject

### Admin
- Review queue
- Contributor role management
- Dashboard metrics

## Bible Source of Truth (Option C)
Bible JSON served from dashboard API.
Data in:
- bible-data/WEB/{book}/{chapter}.json
- bible-data/KJV/{book}/{chapter}.json

## Dev
```bash
npm run dev