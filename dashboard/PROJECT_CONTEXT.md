# Apostolic Graphix – Bible Commentary Dashboard (Context)

Tech:
- Next.js App Router
- NextAuth Credentials (admin/contributor/user roles)
- Prisma + Postgres (Supabase)
- Bible JSON served locally via dashboard API (WEB + KJV)

Key routes:
- /signin (custom sign in page)
- /dashboard (role-aware dashboard)
- /dashboard/mine (filters: ALL/DRAFT/PENDING/PUBLISHED)
- /dashboard/review (admin queue approve/reject)
- /dashboard/contributors (admin role manager + create contributor)
- /dashboard/bible (BibleExplorer reads /api/bible, Add Commentary button on selected verse)
- /dashboard/commentary/new (new commentary with Bible preview + version selector WEB/KJV)

Rules:
- Do NOT redesign UI unless explicitly asked.
- Do NOT rename routes or move files unless asked.
- Keep role rules intact:
  - ADMIN can approve/reject and publish
  - CONTRIBUTOR submits for review
  - USER read-only
- Prefer minimal changes per task.
