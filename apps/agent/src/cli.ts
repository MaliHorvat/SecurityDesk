#!/usr/bin/env node
/**
 * SecurityDesk local agent (Phase 1 stub).
 *
 * Design decisions:
 * - Outbound-only HTTPS to SaaS (no inbound shell / RDP).
 * - Only allowlisted check types (ping, TCP, HTTP, RTSP, …) will be executed in Phase 7.
 * - Enrollment uses one-time tokens revoked after use.
 */

const USAGE = `SecurityDesk Agent

Ukazi:
  securitydesk-agent enroll
  securitydesk-agent heartbeat
  securitydesk-agent status

Konfiguracija prek okoljskih spremenljivk:
  AGENT_API_URL, AGENT_ID, AGENT_TOKEN
`;

async function main() {
  const command = process.argv[2] ?? "help";

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(USAGE);
    return;
  }

  if (command === "enroll") {
    console.log("Enrollment bo na voljo v Fazi 7 (lokalni agent in monitoring).");
    console.log("Pripravljena sta CLI vmesnik in outbound-only komunikacijski model.");
    return;
  }

  if (command === "heartbeat") {
    const api = process.env.AGENT_API_URL;
    if (!api || !process.env.AGENT_TOKEN) {
      console.error("Manjkata AGENT_API_URL ali AGENT_TOKEN.");
      process.exitCode = 1;
      return;
    }
    console.log(`Heartbeat stub → ${api} (implementacija v Fazi 7)`);
    return;
  }

  if (command === "status") {
    console.log(
      JSON.stringify(
        {
          agentId: process.env.AGENT_ID || null,
          apiUrl: process.env.AGENT_API_URL || null,
          enrolled: Boolean(process.env.AGENT_TOKEN),
          phase: 1,
        },
        null,
        2,
      ),
    );
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
