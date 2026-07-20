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

## Produkcijske okoljske spremenljivke (obvezno)

Na Vercelu (**Project → Settings → Environment Variables**) nastavite iste vrednosti kot v lokalni `.env.local`, zlasti:

| Spremenljivka | Primer za produkcijo |
|---|---|
| `APP_URL` | `https://securitydesk.visionone.si` |
| `NEXT_PUBLIC_APP_URL` | `https://securitydesk.visionone.si` |
| `BETTER_AUTH_URL` | `https://securitydesk.visionone.si` (opcijsko, priporočeno) |
| `AUTH_SECRET` | enak kot lokalno (min. 32 znakov) |
| `ENCRYPTION_KEY` | enak kot lokalno |
| `CRON_SECRET` | enak kot lokalno |
| `AGENT_SIGNING_SECRET` | enak kot lokalno |
| `DB_PROVIDER` | `mysql` |
| `DB_HOST` | IP/host baze |
| `DB_PORT` | `3306` |
| `DB_NAME` | ime baze |
| `DB_USER` / `DB_PASSWORD` | dostop do baze |
| `DATABASE_URL` | polni connection string (priporočeno) |

**Pomembno:** `APP_URL` ne sme ostati `http://localhost:3000` na produkciji — prijava/registracija potem ne delujeta na lastni domeni.

Po spremembi env na Vercelu naredite **Redeploy**.

## Diagnostika po deployu

Odprite:

```
https://securitydesk.visionone.si/api/health
```

Pričakovan odgovor: `"ok": true` in `"database": { "ok": true }`.

Če `database.ok` ni `true`, MySQL strežnik verjetno ne dovoljuje povezav z Vercel IP naslovov — na gostovanju omogočite oddaljen dostop (remote MySQL) za Vercel.

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
