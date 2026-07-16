import { requireOrgSession } from "@/lib/org-context";
import { listCustomers } from "@/server/customers";
import { listSites } from "@/server/sites";
import { CctvProjectEditor } from "@/components/projects/cctv-project-editor";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const session = await requireOrgSession("projects:write");
  const [customers, sites] = await Promise.all([listCustomers(), listSites()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nov CCTV projekt</h1>
      <CctvProjectEditor
        mode="create"
        orgName={session.organization.name}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        sites={sites.map(({ site }) => ({ id: site.id, name: site.name }))}
      />
    </div>
  );
}
