# Namestitev lokalnega agenta

Agent teče v omrežju stranke in vzpostavlja **samo odhodne** šifrirane povezave do SaaS.

## 1. V portalu

1. Odprite **Monitoring**.
2. Ustvarite **enrollment žeton** (enkratna uporaba, časovno omejen).
3. Po želji dodajte preverjanja (ping / TCP / HTTP / HTTPS / RTSP) za naprave.

## 2. Na strežniku / PC v omrežju stranke

```bash
# iz monorepo root
export AGENT_API_URL="https://vaša-domena/api/agent"
# ali lokalno:
# export AGENT_API_URL="http://localhost:3000/api/agent"

pnpm agent:dev enroll <ENROLLMENT_TOKEN> --name "Agent-Skladišče"

# shranite izpisane AGENT_ID in AGENT_TOKEN
export AGENT_ID="..."
export AGENT_TOKEN="..."

pnpm agent:dev heartbeat
pnpm agent:dev checks
pnpm agent:dev run-once
pnpm agent:dev status
```

## Dovoljeni tipi preverjanj

Agent **ne** izvaja poljubnih shell ukazov. Allowlist:

- `ping` – TCP reachability (proxy, ker ICMP pogosto zahteva root)
- `tcp` – TCP povezava na porta
- `http` / `https` – HTTP GET
- `rtsp` – TCP na 554 (ali podano vrata)

## Načini namestitve (načrt)

Docker, Windows Service, systemd, ročni zagon.

**Ne** omogoča remote desktopa ali shell dostopa.
