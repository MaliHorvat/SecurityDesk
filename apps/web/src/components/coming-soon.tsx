import { EmptyState } from "@securitydesk/ui";
import { getDictionary } from "@/lib/i18n";

export function ComingSoonModule({ moduleName }: { moduleName: string }) {
  const t = getDictionary("sl");
  return (
    <EmptyState
      title={`${moduleName} – ${t.comingSoon.title}`}
      description={t.comingSoon.description}
    />
  );
}
