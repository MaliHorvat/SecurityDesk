import { getAppUrl } from "@/lib/app";

export function QrPanel({ token, label }: { token: string; label: string }) {
  const url = `${getAppUrl()}/q/${token}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrSrc} alt={`QR koda za ${label}`} width={180} height={180} className="rounded-md bg-white p-2" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="break-all text-xs text-muted-foreground">{url}</p>
      </div>
    </div>
  );
}
