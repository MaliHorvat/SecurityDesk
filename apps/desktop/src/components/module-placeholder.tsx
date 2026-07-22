import { Card, CardContent, CardHeader, CardTitle } from "@securitydesk/ui";
import { t } from "@/lib/i18n";

const WEB_URL = (import.meta.env.VITE_SECURITYDESK_WEB_URL as string | undefined)?.replace(/\/$/, "") || "";

export function ModulePlaceholderPage({
  title,
  description,
  webPath,
}: {
  title: string;
  description?: string;
  webPath?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {description ?? "Modul je v namizni aplikaciji povezan z istim API-jem kot spletni portal."}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stanje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Seznamni in urejevalni pogledi za ta modul se postopoma selijo iz Next.js strežniških akcij v
            skupni REST API (<code className="text-foreground">/api/desktop/*</code>).
          </p>
          {webPath && WEB_URL ? (
            <p>
              Celotna spletna različica:{" "}
              <a className="text-primary underline" href={`${WEB_URL}${webPath}`} target="_blank" rel="noreferrer">
                {WEB_URL}
                {webPath}
              </a>
            </p>
          ) : null}
          <p className="text-xs">{t.common.onlineOnlyNote}</p>
        </CardContent>
      </Card>
    </div>
  );
}
