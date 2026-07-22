/**
 * Minimal Slovenian copy for the desktop shell, mirroring the vocabulary
 * used in `apps/web/src/lib/i18n.ts` so the two apps feel consistent.
 * The desktop app currently ships Slovenian-only; English can be added
 * later by extending this dictionary the same way the web app does.
 */
export const t = {
  appName: "SecurityDesk",
  brandTagline: "Modularna platforma za varnostne in tehnične sisteme",
  auth: {
    login: "Prijava",
    email: "E-pošta",
    password: "Geslo",
    signIn: "Prijavi se",
    signingIn: "Prijava …",
    logout: "Odjava",
    loginFailed: "Prijava ni uspela. Preverite podatke in poskusite znova.",
    offlineHint: "Brez povezave — preverite internetno povezavo do strežnika SecurityDesk.",
  },
  nav: {
    dashboard: "Nadzorna plošča",
    customers: "Stranke",
    sites: "Objekti",
    devices: "Naprave",
    projects: "Projekti",
    cameraDeploy: "CameraDeploy",
    floorplans: "Tlorisi",
    inventory: "Skladišče",
    network: "Omrežje",
    configVault: "ConfigVault",
    firmware: "FirmwareGuard",
    service: "Servis",
    handover: "Predaja",
    monitoring: "Monitoring",
    ai: "AI pomočnik",
    reports: "Poročila",
    settings: "Nastavitve",
    desktopReleases: "Namizne izdaje",
  },
  common: {
    loading: "Nalaganje…",
    error: "Prišlo je do napake",
    retry: "Poskusi znova",
    save: "Shrani",
    cancel: "Prekliči",
    onlineOnlyNote: "Operacije, ki zahtevajo strežnik, so na voljo samo online.",
  },
  offline: {
    title: "Brez povezave",
    description: "Ni mogoče vzpostaviti povezave s strežnikom SecurityDesk. Preverite internetno povezavo.",
    retry: "Poskusi znova",
  },
  update: {
    title: "Na voljo je posodobitev",
    description: "Na voljo je nova različica SecurityDesk.",
    later: "Kasneje",
    install: "Namesti in znova zaženi",
    installing: "Nameščanje posodobitve …",
    upToDate: "Uporabljate najnovejšo različico.",
    checking: "Preverjanje posodobitev …",
    checkFailed: "Preverjanje posodobitev ni uspelo.",
  },
  settings: {
    title: "Nastavitve",
    version: "Različica",
    platform: "Platforma",
    installationId: "ID namestitve",
    checkUpdates: "Preveri posodobitve",
  },
} as const;
