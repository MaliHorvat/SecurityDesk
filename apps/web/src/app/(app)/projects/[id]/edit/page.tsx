import { notFound } from "next/navigation";
import { getCctvProject } from "@/server/projects";
import { listCustomers } from "@/server/customers";
import { listSites } from "@/server/sites";
import { requireOrgSession } from "@/lib/org-context";
import { CctvProjectEditor } from "@/components/projects/cctv-project-editor";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession("projects:write");
  const { id } = await params;
  const [data, customers, sites] = await Promise.all([getCctvProject(id), listCustomers(), listSites()]);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Uredi: {data.project.name}</h1>
      <CctvProjectEditor
        mode="edit"
        projectId={id}
        orgName={session.organization.name}
        initial={data.input}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        sites={sites.map(({ site }) => ({ id: site.id, name: site.name }))}
      />
    </div>
  );
}
