import { WifiOff } from "lucide-react";
import { Button } from "@securitydesk/ui";
import { t } from "@/lib/i18n";
import { useOffline } from "@/providers/offline-provider";

export function OfflinePage() {
  const { checkNow } = useOffline();

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <WifiOff className="h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">{t.offline.title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t.offline.description}</p>
      <Button onClick={() => void checkNow()}>{t.offline.retry}</Button>
    </div>
  );
}
