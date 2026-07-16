import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function QrRedirectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getAppSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/q/${token}`)}`);
  }

  const { db, schema } = getDb();

  const [device] = await db
    .select()
    .from(schema.device)
    .where(and(eq(schema.device.qrToken, token), isNull(schema.device.deletedAt)))
    .limit(1);

  if (device) {
    if (device.organizationId !== session.organization?.id) {
      redirect("/dashboard");
    }
    redirect(`/devices/${device.id}`);
  }

  const [site] = await db
    .select()
    .from(schema.site)
    .where(and(eq(schema.site.qrToken, token), isNull(schema.site.deletedAt)))
    .limit(1);

  if (site) {
    if (site.organizationId !== session.organization?.id) {
      redirect("/dashboard");
    }
    redirect(`/sites/${site.id}`);
  }

  redirect("/dashboard");
}
