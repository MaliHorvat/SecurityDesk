# Deployment na Vercel (začetnik)

1. Ustvarite GitHub repozitorij in potisnite to kodo.
2. Na [vercel.com](https://vercel.com) → Add New Project → uvozite repozitorij.
3. Framework: Next.js. Root: monorepo root (uporabi `vercel.json`).
4. Nastavite okoljske spremenljivke iz `.env.example` (produkcijske skrivnosti!).
5. Deploy.
6. Migracije zaženite **ločeno** (lokalno ali CI job), ne ob vsakem page loadu:
   ```bash
   pnpm db:migrate
   ```
7. Domene: Project → Domains → dodajte lastno domeno.

Build ukazi so v root `package.json`. CI preveri lint/typecheck/test/build ob PR.
