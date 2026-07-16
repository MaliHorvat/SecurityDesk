# Varnost

- Gesla uporabnikov: zgoščena prek Better Auth (nikoli v berljivi obliki).
- Občutljive poverilnice naprav: AES-256-GCM (`ENCRYPTION_KEY` samo v env).
- Tenant izolacija: `organizationId` + strežniška dovoljenja.
- HTTP glave: X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy.
- Rate limiting prijav (Better Auth).
- Revizijska tabela `audit_log` (razširitev dogodkov v naslednjih fazah).
- `NEXT_PUBLIC_*` spremenljivke so javne – vanje ne spadajo skrivnosti.
