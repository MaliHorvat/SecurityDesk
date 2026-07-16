# Deployment na Vercel (monorepo)

## Pomembno: Root Directory

Vercel mora pokazati na Next.js app, ne na root monorepa:

1. Project → **Settings → General → Root Directory** → nastavite **`apps/web`**
2. Framework Preset: **Next.js**
3. Install / Build ukazi so v `apps/web/vercel.json` (že nastavljeno):
   - Install: `cd ../.. && pnpm install`
   - Build: `cd ../.. && pnpm --filter @securitydesk/web build`

Če Root Directory ostane `.` (repo root), Vercel javi:
`No Next.js version detected` — ker root `package.json` nima odvisnosti `next`.

## Koraki

1. Ustvarite GitHub repozitorij in potisnite kodo.
2. Na [vercel.com](https://vercel.com) → Add New Project → uvozite repozitorij.
3. **Root Directory = `apps/web`** (glej zgoraj).
4. Nastavite okoljske spremenljivke iz `.env.example` (produkcijske skrivnosti!).
5. Deploy.
6. Migracije zaženite **ločeno** (lokalno ali CI job), ne ob vsakem page loadu:
   ```bash
   pnpm db:migrate
   ```
7. Domene: Project → Domains → dodajte lastno domeno.

CI preveri lint/typecheck/test/build ob PR.
