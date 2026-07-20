import { requireOrgSession } from "@/lib/org-context";
import { AiTroubleshooterClient } from "@/components/ai/ai-troubleshooter-client";

export default async function Page() {
  await requireOrgSession("ai:use");
  return <AiTroubleshooterClient />;
}
