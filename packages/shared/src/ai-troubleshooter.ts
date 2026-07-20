import { z } from "zod";

export const aiTroubleshootingInputSchema = z.object({
  ticketTitle: z.string().min(1),
  faultDescription: z.string().optional().or(z.literal("")),
  workPerformed: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
});

export type AiTroubleshootingInput = z.infer<typeof aiTroubleshootingInputSchema>;

export const troubleshootingAiDraftSchema = z.object({
  headline: z.string(),
  likelyCauses: z.array(z.string()).min(1),
  nextChecks: z.array(z.string()).min(1),
  recommendedActions: z.array(z.string()).min(1),
});

export type TroubleshootingAiDraft = z.infer<typeof troubleshootingAiDraftSchema>;

export const serviceReportAiDraftSchema = z.object({
  findings: z.string(),
  recommendations: z.string(),
  customerSummary: z.string(),
});

export type ServiceReportAiDraft = z.infer<typeof serviceReportAiDraftSchema>;

function hasAny(haystack: string, needles: string[]) {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
}

export function heuristicTroubleshooting(input: AiTroubleshootingInput): TroubleshootingAiDraft {
  const fault = input.faultDescription?.trim() ?? "";
  const work = input.workPerformed?.trim() ?? "";
  const category = input.category?.trim().toLowerCase() ?? "";
  const combined = `${fault}\n${work}`.trim();

  const isCctv =
    category === "cctv" ||
    hasAny(combined, ["kamera", "rtsp", "nvr", "vms", "black", "slika", "stream", "živa"]);
  const isOffline = hasAny(combined, ["offline", "ne odgovarja", "timeout", "nedosegljiv", "down"]);
  const isBlack = hasAny(combined, ["black", "čr", "brez slike", "no image", "video izgubljen"]);
  const isAuth = hasAny(combined, ["geslo", "username", "password", "auth", "401", "unauthorized"]);
  const isNetwork = hasAny(combined, ["ip", "dns", "gateway", "vlan", "port", "tcp", "http", "https"]);

  if (isCctv) {
    const likelyCauses: string[] = [];
    if (isOffline) likelyCauses.push("Naprava (kamera/NVR) je nedosegljiva: napajanje, povezava ali storitev se ne odziva.");
    if (isBlack) likelyCauses.push("RTSP/stream se ne predvaja (kodeki, pravilna URL shema ali storitev na napravi).");
    if (isAuth) likelyCauses.push("Nepravilni dostopni podatki (uporabnik/geslo) ali sprememba konfiguracije na napravi.");
    if (isNetwork) likelyCauses.push("Omrežna pot: VLAN/PoE/port, DNS ali napačen IP/vrata.");
    if (likelyCauses.length === 0) {
      likelyCauses.push("Nejasna simptomatika; potrebno je preverjanje omrežja in stanja streama.");
    }

    const nextChecks: string[] = [];
    nextChecks.push("Ping/TCP preverjanje dosegljivosti naprave (IP/porta).");
    nextChecks.push("Preveri HTTP/HTTPS odziv na napravi (če je omogočeno).");
    nextChecks.push("Preveri RTSP stream (554 ali podana vrata) in osnovne URL-je.");
    nextChecks.push("Preveri PoE/napajanje, VLAN in switch port (up/down, error).");

    const recommendedActions: string[] = [];
    recommendedActions.push("Če je naprava nedosegljiva: najprej preveri napajanje, nato omrežni priključek (switch/VLAN/port).");
    recommendedActions.push("Če je stream “black”: preveri pravilnost RTSP URL, kodeke in ponovno zaženi storitev (kamera ali NVR).");
    recommendedActions.push("Če je težava avtentikacija: obnovi pravilna gesla in preveri, da so uporabljene pravilne metode (digest/basic).");
    recommendedActions.push("Zabeleži ugotovitve za zapisnik (kaj je bilo preverjeno in kaj je bilo popravljeno).");

    const headline = isOffline ? "Kamera/NVR nedosegljiva – predlagan diagnostični postopek" : "Diagnostika CCTV težave – predlagani naslednji koraki";

    return {
      headline,
      likelyCauses,
      nextChecks,
      recommendedActions,
    };
  }

  const likelyCauses: string[] = [];
  if (isOffline) likelyCauses.push("Stanje nedosegljivosti: napajanje, omrežje ali servis ne deluje.");
  if (isAuth) likelyCauses.push("Težava z avtentikacijo: neveljavni podatki ali sprememba dostopa.");
  if (isNetwork) likelyCauses.push("Omrežna nastavitev (IP/VLAN/DNS/port) ni usklajena s pričakovanjem.");
  if (likelyCauses.length === 0) likelyCauses.push("Nejasni razlog; potrebno je sistematično preverjanje elementov sistema.");

  const nextChecks: string[] = [
    "Preveri osnovno dosegljivost (ping/TCP) in pravilnost IP/vrat.",
    "Preveri servis/loge (storitev/naprava) in zadnje spremembe.",
    "Preveri konfiguracijo in povezave (kabliranje, VLAN, uporabniške pravice).",
    "Dodatno preverjanje: ponovi test z istimi parametri po popravku.",
  ];

  const recommendedActions: string[] = [
    "Uredi osnovne pogoje (napajanje, omrežna pot, dostop) in ponovno izvedi test.",
    "Če je vzrok konfiguracija, popravi in zabeleži spremembe.",
    "Če je vzrok napaka naprave, pripravi eskalacijo dobavitelju/proizvajalcu.",
  ];

  return {
    headline: "Diagnostika težave – predlagani naslednji koraki",
    likelyCauses,
    nextChecks,
    recommendedActions,
  };
}

export function heuristicServiceReportDraft(input: AiTroubleshootingInput): ServiceReportAiDraft {
  const t = heuristicTroubleshooting(input);
  const fault = input.faultDescription?.trim();
  const work = input.workPerformed?.trim();

  const findings = [
    `Simptom: ${fault || "—"}`,
    "",
    "Preverjeno:",
    ...t.nextChecks.map((c) => `- ${c}`),
    "",
    "Ugotovitve (povzetek):",
    ...t.likelyCauses.map((c) => `- ${c}`),
  ]
    .filter(Boolean)
    .join("\n");

  const recommendations = [
    "Priporočila:",
    ...t.recommendedActions.map((a) => `- ${a}`),
    work ? "" : "",
    work ? `Izvedena dela (po uporabniku): ${work}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const customerSummary = [
    "Strankin povzetek:",
    `Ugotovili smo vzrok na osnovi preverjanj in izvedli potrebne korake za ponovno delovanje.`,
    `Naslednji koraki vključujejo: ${t.recommendedActions[0] ?? "dodatna preverjanja po potrebi"}`,
  ].join(" ");

  return { findings, recommendations, customerSummary };
}

