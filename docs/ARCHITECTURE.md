# Arhitektura

SecurityDesk je večnajemniški monorepo:

- **apps/web** – Next.js App Router, deploy na Vercel
- **apps/agent** – lokalni agent v omrežju stranke (samo odhodne TLS povezave)
- **packages/** – deljena domena, UI, baza, AI, integracije

## Večnajemništvo

Vsak poslovni zapis mora imeti `organizationId`. Izolacija se izvaja v:

1. podatkovnih poizvedbah
2. servisnem sloju
3. API-jih / Server Actions
4. datotekah, AI in izvozih

UI skrivanje menijev **ni** zadostna zaščita.

## Vloge

Centralni katalog: `@securitydesk/shared` (`ROLE_PERMISSIONS`).

- `platform_super_admin`
- `organization_owner`
- `organization_admin`
- `technician`
- `viewer`
- `customer_user`

## Baza

`DB_PROVIDER=mysql|postgresql` izbere Drizzle shemo. Modeli in relacije so usklajeni v obeh shemah.

## Agent

Agent ne sme izvajati poljubnih shell ukazov. Dovoljeni so samo allowlisted tipi preverjanj (Faza 7).
