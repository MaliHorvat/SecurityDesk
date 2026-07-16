# Lokalni razvoj

1. Namestite Node 20+ in pnpm 9+.
2. `pnpm install`
3. `pnpm setup` (ali ročno `.env.local`)
4. Pripravite prazno MySQL/MariaDB (ali PostgreSQL) bazo in uporabnika.
5. `pnpm db:generate && pnpm db:migrate`
6. `pnpm dev`

E-pošta v razvoju gre v konzolo (`MAIL_DRIVER=console`).

AI je privzeto izključen (`AI_PROVIDER=disabled`) – aplikacija se ne sesuje.
