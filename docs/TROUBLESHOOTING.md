# Odpravljanje težav

| Simptom | Preverite |
|---------|-----------|
| Build / zagon: manjka AUTH_SECRET | `pnpm setup` |
| db:test TCP FAIL | firewall, host, dovoljenja oddaljenega dostopa |
| Prijava ne deluje | migracije, AUTH_SECRET, APP_URL |
| E-pošta ne pride | `MAIL_DRIVER=console` v razvoju – glejte terminal |
| AI “ni na voljo” | pričakovano, če `AI_PROVIDER=disabled` ali manjka ključ |
