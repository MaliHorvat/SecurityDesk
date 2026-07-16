# Zunanja podatkovna baza

## 1. Ugotovite vrsto baze

Ponudnik (npr. PlanetScale, Aiven, RDS, managed MariaDB) navede MySQL ali PostgreSQL. Nastavite:

```
DB_PROVIDER="mysql"   # ali postgresql
```

## 2. Host, port, baza, uporabnik

V konzoli ponudnika ustvarite:

1. bazo (npr. `securitydesk`)
2. uporabnika z omejenimi pravicami (SELECT/INSERT/UPDATE/DELETE + migracije DDL po potrebi)
3. zabeležite host in port (MySQL 3306, PostgreSQL 5432)

## 3. Oddaljene povezave in SSL

- Dovolite IP-je Vercela / vašega odjemalca ali uporabite proxy.
- Vklopite SSL, če ga ponudnik zahteva (`DB_SSL=true`).
- Če oddaljene povezave niso dovoljene, aplikacija na Vercelu **ne bo** dosegla baze.

## 4. Preverjanje

```bash
pnpm db:test
```

Ukaz preveri DNS, TCP, SSL in `SELECT 1` – **ne izpiše gesla**.

## 5. Vercel

V Project → Settings → Environment Variables nastavite enake ključe kot v `.env.example` (brez lokalnega `STORAGE_DRIVER=local` – uporabite `vercel_blob` ali `s3`).
