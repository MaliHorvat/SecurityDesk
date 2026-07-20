"use server";

import { createAiClient } from "@securitydesk/ai";
import type { AiCompletionResult } from "@securitydesk/ai";
import {
  aiTroubleshootingInputSchema,
  heuristicServiceReportDraft,
  heuristicTroubleshooting,
  type AiTroubleshootingInput,
  type ServiceReportAiDraft,
  type TroubleshootingAiDraft,
} from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { writeAuditLog } from "@/server/audit";
import type { ActionResult } from "@/server/customers";

function buildAiSystemPrompt() {
  return [
    "Si pomočnik za diagnostiko in pripravo servisne dokumentacije v slovenskem jeziku.",
    "Ne navajaj kot končnih dejstev stvari, ki niso potrjene.",
    "Odgovori kratko in praktično, v slovenščini.",
  ].join(" ");
}

function buildAiPrompt(input: AiTroubleshootingInput) {
  return [
    `Naslov težave: ${input.ticketTitle}`,
    input.category?.trim() ? `Kategorija: ${input.category}` : null,
    input.faultDescription?.trim() ? `Opis napake: ${input.faultDescription}` : null,
    input.workPerformed?.trim() ? `Izvedena dela: ${input.workPerformed}` : null,
    "",
    "Vrni predlog: (1) povzetek diagnoze, (2) najverjetnejši vzroki, (3) naslednji koraki preverjanja, (4) priporočena popravila.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function maybeAiExplain(
  input: AiTroubleshootingInput,
): Promise<{ available: boolean; text?: string; reason?: string }> {
  const ai = createAiClient();
  let result: AiCompletionResult;
  try {
    result = await ai.complete({
      system: buildAiSystemPrompt(),
      prompt: buildAiPrompt(input),
      temperature: 0.2,
    });
  } catch {
    return { available: false, reason: "AI napaka med generiranjem." };
  }

  if (!result.available) {
    return { available: false, reason: result.reason };
  }
  return { available: true, text: result.text };
}

export async function generateTroubleshootingDraft(
  raw: AiTroubleshootingInput,
): Promise<ActionResult<{ draft: TroubleshootingAiDraft; aiAvailable: boolean; aiText?: string }>> {
  const session = await requireOrgSession("ai:use");
  const parsed = aiTroubleshootingInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const input = parsed.data;
  const draft = heuristicTroubleshooting(input);

  const ai = await maybeAiExplain(input);

  await writeAuditLog({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    action: "ai.troubleshooter.generate",
    entityType: "ai_troubleshooter",
    metadata: {
      aiAvailable: ai.available,
      ticketTitle: input.ticketTitle,
    },
  });

  return {
    ok: true,
    data: {
      draft,
      aiAvailable: ai.available,
      aiText: ai.text,
    },
  };
}

export async function generateServiceReportAiDraft(
  raw: AiTroubleshootingInput,
): Promise<ActionResult<ServiceReportAiDraft>> {
  const session = await requireOrgSession("ai:use");
  const parsed = aiTroubleshootingInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const input = parsed.data;
  const draft = heuristicServiceReportDraft(input);

  // We don't block UX on AI. If AI is available, we still return structured draft.
  await maybeAiExplain(input);

  await writeAuditLog({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    action: "ai.service_report.generate",
    entityType: "service_report_ai",
    metadata: {
      ticketTitle: input.ticketTitle,
    },
  });

  return { ok: true, data: draft };
}

