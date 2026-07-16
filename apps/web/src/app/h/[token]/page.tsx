import { notFound } from "next/navigation";
import { getHandoverByPublicToken } from "@/server/handover";
import { PublicHandoverClient } from "@/components/handover/public-handover-client";

export const dynamic = "force-dynamic";

export default async function PublicHandoverPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getHandoverByPublicToken(token);
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicHandoverClient
        token={token}
        title={data.package.title}
        customerName={data.customerName}
        status={data.package.status}
        description={data.package.description}
        deviceSummary={data.package.deviceSummary}
        ipTable={data.package.ipTable}
        retentionNotes={data.package.retentionNotes}
        serviceContacts={data.package.serviceContacts}
        checklist={data.checklist}
        documents={data.documents}
        signatures={data.signatures}
      />
    </main>
  );
}
