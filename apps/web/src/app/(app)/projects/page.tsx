import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Button, EmptyState, Input, buttonVariants, cn } from "@securitydesk/ui";
import { listCctvProjects } from "@/server/projects";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireOrgSession("projects:read");
  const { q } = await searchParams;
  const projects = await listCctvProjects(q);
  const canWrite = hasPermission(session.role, "projects:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CCTV projekti</h1>
          <p className="text-sm text-muted-foreground">{projects.length} projektov</p>
        </div>
        {canWrite ? (
          <Link href="/projects/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4" />
            Nov projekt
          </Link>
        ) : null}
      </div>

      <form className="flex gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Išči projekte…" className="max-w-md" />
        <Button type="submit" variant="outline">
          Išči
        </Button>
      </form>

      {projects.length === 0 ? (
        <EmptyState
          title="Ni CCTV projektov"
          description="Ustvarite projekt za izračun hrambe, pasovne širine in opreme."
          action={
            canWrite ? (
              <Link href="/projects/new" className={cn(buttonVariants())}>
                Nov projekt
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 font-medium">Projekt</th>
                <th className="p-3 font-medium">Stranka</th>
                <th className="p-3 font-medium">Objekt</th>
                <th className="p-3 font-medium">Hramba</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(({ project, customerName, siteName }) => {
                const result = project.resultJson ? JSON.parse(project.resultJson) : null;
                return (
                  <tr key={project.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <Link href={`/projects/${project.id}`} className="font-medium text-primary hover:underline">
                        {project.name}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">{customerName ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{siteName ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {result ? `${result.totalRequiredTb} TB / ${result.totalCameras} kam.` : "—"}
                    </td>
                    <td className="p-3">
                      <Badge>{project.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
