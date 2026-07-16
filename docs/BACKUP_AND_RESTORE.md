# Varnostne kopije in obnovitev

1. Pred večjo migracijo naredite dump baze (mysqldump / pg_dump).
2. Migracije zaganjajte kontrolirano (`pnpm db:migrate`), ne ob page loadu.
3. Datoteke: odvisno od `STORAGE_DRIVER` (S3 / Vercel Blob) – lokalni disk ni produkcijski.
4. Obnovitev: obnovite dump, nato po potrebi ponovno zaženite manjkajoče migracije.
