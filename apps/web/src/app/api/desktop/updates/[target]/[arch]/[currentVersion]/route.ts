import { NextRequest, NextResponse } from "next/server";
import { desktopArchitectureSchema, desktopChannelSchema, desktopPlatformSchema } from "@securitydesk/shared";
import { createSignedToken } from "@securitydesk/shared/crypto";
import { getAppUrl } from "@/lib/app";
import { findDesktopUpdate, markInstallationUpdateCheck } from "@/server/desktop-api";

export const dynamic = "force-dynamic";

const DOWNLOAD_TOKEN_TTL_MS = Number(process.env.DESKTOP_DOWNLOAD_TOKEN_TTL_MINUTES ?? 10) * 60 * 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ target: string; arch: string; currentVersion: string }> },
) {
  const { target, arch, currentVersion } = await params;

  const platform = desktopPlatformSchema.safeParse(target);
  const architecture = desktopArchitectureSchema.safeParse(arch);
  if (!platform.success || !architecture.success || !currentVersion) {
    return NextResponse.json({ error: "Neveljaven target/arch/currentVersion." }, { status: 400 });
  }

  const installationId =
    request.nextUrl.searchParams.get("installationId") ??
    request.headers.get("x-securitydesk-installation-id");
  if (!installationId) {
    return NextResponse.json({ error: "Manjka installationId." }, { status: 400 });
  }

  const channelRaw = request.nextUrl.searchParams.get("channel") ?? request.headers.get("x-securitydesk-channel");
  const channel = desktopChannelSchema.safeParse(channelRaw ?? "stable");

  const match = await findDesktopUpdate({
    platform: platform.data,
    architecture: architecture.data,
    channel: channel.success ? channel.data : "stable",
    currentVersion,
    installationId,
  });

  await markInstallationUpdateCheck(installationId, match?.version ?? null);

  if (!match) {
    return new NextResponse(null, { status: 204 });
  }

  const secret = process.env.AGENT_SIGNING_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Manjka podpisni ključ za prenose." }, { status: 500 });
  }

  const downloadToken = createSignedToken(
    { key: match.artifact.downloadUrlReference },
    secret,
    DOWNLOAD_TOKEN_TTL_MS,
  );
  const url = `${getAppUrl()}/api/desktop/download?token=${encodeURIComponent(downloadToken)}`;

  return NextResponse.json({
    version: match.version,
    pub_date: (match.publishedAt ?? new Date()).toISOString(),
    url,
    signature: match.artifact.signature ?? "",
    notes: match.notes ?? "",
  });
}
