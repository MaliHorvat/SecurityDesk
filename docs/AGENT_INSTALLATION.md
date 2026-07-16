# Namestitev lokalnega agenta

Agent teče v omrežju stranke in vzpostavlja **samo odhodne** šifrirane povezave do SaaS.

```bash
pnpm agent:dev status
pnpm agent:dev enroll   # Faza 7
```

Podprti načini (načrt): Docker, Windows Service, systemd, ročni zagon.

**Ne** omogoča remote desktopa ali shell dostopa.
