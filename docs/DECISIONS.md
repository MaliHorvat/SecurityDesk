# Odločitve – Faza 1

| Odločitev | Zakaj | Alternative | Vpliv na Vercel / zunanjo DB |
|-----------|-------|-------------|------------------------------|
| Drizzle ORM + ločene MySQL/PG sheme | Zahteva dokumentacije; dober TS DX | Prisma multi-schema | Migracije ločeno od requestov |
| Better Auth + organization plugin | Email/password, seje, org membership | Auth.js, Clerk | Auth podatki v lastni zunanji DB |
| pnpm workspaces monorepo | Zahtevano | Turborepo+npm | `vercel.json` build iz roota |
| Console mail driver | Lokalni razvoj brez SMTP | Mailhog, Resend | Produkcija: SMTP env |
| AI disabled privzeto | Ne sme sesuti aplikacije | Stub provider | Kasneje API ključi na Vercelu |
| Agent outbound-only stub | Varnost; Faza 7 | — | Agent ne teče na Vercelu |
| React Konva za FloorPlan | React API, dinamični import, pan/zoom/FOV | Fabric.js | Manjši bundle na editor strani |
| Inventory append-only movements | Revizijska sled zaloge | Neposredni UPDATE qty | Optimistični `version` na stock |
| Tauri 2 za namizno app | Zahtevano; native updater, manjši footprint | Electron | CI Windows build + podpisovanje |
| Desktop Bearer API (ne DB) | Desktop ne sme imeti DB gesel | WebView na portal | `/api/desktop/*` + `desktop_api_token` |
