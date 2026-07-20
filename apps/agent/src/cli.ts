#!/usr/bin/env node
/**
 * SecurityDesk local agent (Phase 7).
 *
 * - Outbound-only HTTPS to SaaS (no inbound shell / RDP).
 * - Only allowlisted check types: ping, tcp, http, https, rtsp.
 * - Enrollment uses one-time tokens revoked after use.
 */

import { createConnection } from "node:net";
import { hostname as osHostname } from "node:os";
import {
  MONITORING_CHECK_TYPES,
  type MonitoringCheckType,
  type MonitoringHealthStatus,
} from "@securitydesk/shared";

const USAGE = `SecurityDesk Agent

Ukazi:
  securitydesk-agent enroll <enrollmentToken> [--name ime]
  securitydesk-agent heartbeat
  securitydesk-agent checks
  securitydesk-agent run-once
  securitydesk-agent status

Okoljske spremenljivke:
  AGENT_API_URL   (npr. http://localhost:3000/api/agent)
  AGENT_ID
  AGENT_TOKEN
`;

type AgentCheck = {
  id: string;
  name: string;
  checkType: MonitoringCheckType;
  targetHost: string;
  targetPort: number | null;
  targetPath: string | null;
  timeoutMs: number;
  deviceId: string;
};

function apiBase(): string {
  const base = process.env.AGENT_API_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("Manjka AGENT_API_URL.");
  }
  return base;
}

function authHeaders(): Record<string, string> {
  const token = process.env.AGENT_TOKEN;
  if (!token) throw new Error("Manjka AGENT_TOKEN. Najprej zaženite enroll.");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function enroll(token: string, name?: string) {
  const res = await fetch(`${apiBase()}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      enrollmentToken: token,
      name: name || `agent-${osHostname()}`,
      hostname: osHostname(),
      version: "0.7.0",
    }),
  });
  const data = (await res.json()) as {
    error?: string;
    agentId?: string;
    agentToken?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `Enrollment ni uspel (${res.status}).`);
  }

  console.log("Enrollment uspešen.");
  console.log(`AGENT_ID=${data.agentId}`);
  console.log(`AGENT_TOKEN=${data.agentToken}`);
  console.log("");
  console.log("Shranite vrednosti v okolje (npr. .env.local) in zaženite heartbeat / run-once.");
}

async function heartbeat() {
  const res = await fetch(`${apiBase()}/heartbeat`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ version: "0.7.0" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || `Heartbeat ni uspel (${res.status}).`);
  console.log(JSON.stringify(data, null, 2));
}

async function fetchChecks(): Promise<AgentCheck[]> {
  const res = await fetch(`${apiBase()}/checks`, { headers: authHeaders() });
  const data = (await res.json()) as { error?: string; checks?: AgentCheck[] };
  if (!res.ok) throw new Error(data.error || `Pridobivanje preverjanj ni uspelo (${res.status}).`);
  return data.checks ?? [];
}

function tcpCheck(host: string, port: number, timeoutMs: number): Promise<{ ok: boolean; latencyMs: number; message: string }> {
  const started = Date.now();
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, latencyMs: Date.now() - started, message: "timeout" });
    }, timeoutMs);

    socket.on("connect", () => {
      clearTimeout(timer);
      socket.end();
      resolve({ ok: true, latencyMs: Date.now() - started, message: "connected" });
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, latencyMs: Date.now() - started, message: err.message });
    });
  });
}

async function httpCheck(
  protocol: "http" | "https",
  host: string,
  port: number | null,
  path: string | null,
  timeoutMs: number,
): Promise<{ ok: boolean; latencyMs: number; message: string }> {
  const started = Date.now();
  const urlPort = port ? `:${port}` : "";
  const urlPath = path?.startsWith("/") ? path : `/${path || ""}`;
  const url = `${protocol}://${host}${urlPort}${urlPath === "/" ? "" : urlPath}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal, redirect: "follow" });
    clearTimeout(timer);
    return {
      ok: res.ok || (res.status >= 200 && res.status < 500),
      latencyMs: Date.now() - started,
      message: `HTTP ${res.status}`,
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      latencyMs: Date.now() - started,
      message: err instanceof Error ? err.message : "request failed",
    };
  }
}

async function runCheck(check: AgentCheck): Promise<{
  checkId: string;
  status: MonitoringHealthStatus;
  latencyMs: number;
  message: string;
  checkedAt: string;
}> {
  if (!MONITORING_CHECK_TYPES.includes(check.checkType)) {
    return {
      checkId: check.id,
      status: "error",
      latencyMs: 0,
      message: `Nedovoljen tip preverjanja: ${check.checkType}`,
      checkedAt: new Date().toISOString(),
    };
  }

  let result: { ok: boolean; latencyMs: number; message: string };

  switch (check.checkType) {
    case "ping":
      // ICMP often requires root; use TCP connect to common/management port as reachability proxy.
      result = await tcpCheck(check.targetHost, check.targetPort ?? 80, check.timeoutMs);
      if (!result.ok && !check.targetPort) {
        const alt = await tcpCheck(check.targetHost, 443, check.timeoutMs);
        if (alt.ok) result = { ...alt, message: "reachable via :443" };
      }
      break;
    case "tcp":
      result = await tcpCheck(check.targetHost, check.targetPort ?? 80, check.timeoutMs);
      break;
    case "http":
      result = await httpCheck("http", check.targetHost, check.targetPort, check.targetPath, check.timeoutMs);
      break;
    case "https":
      result = await httpCheck("https", check.targetHost, check.targetPort, check.targetPath, check.timeoutMs);
      break;
    case "rtsp":
      result = await tcpCheck(check.targetHost, check.targetPort ?? 554, check.timeoutMs);
      break;
    default:
      result = { ok: false, latencyMs: 0, message: "unsupported" };
  }

  return {
    checkId: check.id,
    status: result.ok ? "online" : "offline",
    latencyMs: result.latencyMs,
    message: result.message,
    checkedAt: new Date().toISOString(),
  };
}

async function runOnce() {
  const checks = await fetchChecks();
  if (checks.length === 0) {
    console.log("Ni omogočenih preverjanj za tega agenta.");
    await heartbeat();
    return;
  }

  const results = [];
  for (const check of checks) {
    const r = await runCheck(check);
    console.log(`${check.name} [${check.checkType}] → ${r.status} (${r.latencyMs}ms) ${r.message}`);
    results.push(r);
  }

  const res = await fetch(`${apiBase()}/results`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ results }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || `Pošiljanje rezultatov ni uspelo (${res.status}).`);
  console.log(JSON.stringify(data, null, 2));
}

async function status() {
  console.log(
    JSON.stringify(
      {
        agentId: process.env.AGENT_ID || null,
        apiUrl: process.env.AGENT_API_URL || null,
        enrolled: Boolean(process.env.AGENT_TOKEN),
        phase: 7,
        allowlistedChecks: MONITORING_CHECK_TYPES,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const command = process.argv[2] ?? "help";

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(USAGE);
    return;
  }

  if (command === "enroll") {
    const token = process.argv[3];
    if (!token) {
      console.error("Uporaba: securitydesk-agent enroll <enrollmentToken> [--name ime]");
      process.exitCode = 1;
      return;
    }
    const nameIdx = process.argv.indexOf("--name");
    const name = nameIdx >= 0 ? process.argv[nameIdx + 1] : undefined;
    await enroll(token, name);
    return;
  }

  if (command === "heartbeat") {
    await heartbeat();
    return;
  }

  if (command === "checks") {
    const checks = await fetchChecks();
    console.log(JSON.stringify(checks, null, 2));
    return;
  }

  if (command === "run-once") {
    await runOnce();
    return;
  }

  if (command === "status") {
    await status();
    return;
  }

  console.error(`Neznan ukaz: ${command}`);
  console.log(USAGE);
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
