import { config } from "dotenv";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createDb } from "./client";
import { PLANS } from "@securitydesk/shared";

// Load monorepo root env
config({ path: resolve(process.cwd(), "../../.env.local") });
config({ path: resolve(process.cwd(), ".env.local") });

/**
 * DEMO SEED — development only.
 * Credentials are intentionally weak and MUST NOT be used in production.
 */
async function seed() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    console.error("Seed je onemogočen v produkciji. Nastavite ALLOW_PROD_SEED=true samo za kontrolirane demo okolja.");
    process.exit(1);
  }

  const { db, schema, provider } = createDb();
  console.log(`Seeding (${provider})…`);

  const orgId = randomUUID();
  const userId = randomUUID();
  const memberId = randomUUID();
  const subId = randomUUID();
  const settingsId = randomUUID();
  const statsId = randomUUID();
  const now = new Date();

  // NOTE: Password hashing is handled by Better Auth at signup.
  // Seed creates org + stats skeleton; demo user is created via /register or better-auth seed helper.
  await db.insert(schema.organization).values({
    id: orgId,
    name: "Aktiva Demo",
    slug: "aktiva-demo",
    planId: "integrator",
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(schema.subscription).values({
    id: subId,
    organizationId: orgId,
    planId: "integrator",
    status: "active",
    currentPeriodStart: now,
    createdAt: now,
    updatedAt: now,
  });

  for (const moduleId of PLANS.integrator.limits.modules) {
    await db.insert(schema.moduleEntitlement).values({
      id: randomUUID(),
      organizationId: orgId,
      moduleId,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.insert(schema.organizationSettings).values({
    id: settingsId,
    organizationId: orgId,
    locale: "sl",
    timezone: "Europe/Ljubljana",
    brandPrimaryColor: "#1d4ed8",
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(schema.dashboardStat).values({
    id: statsId,
    organizationId: orgId,
    customersCount: 2,
    sitesCount: 3,
    devicesCount: 20,
    openTicketsCount: 1,
    onlineDevicesCount: 16,
    offlineDevicesCount: 4,
    updatedAt: now,
  });

  console.log("Seed dokončan.");
  console.log("Organizacija: Aktiva Demo (slug: aktiva-demo)");
  console.log("Naslednji korak: registrirajte se v aplikaciji in ustvarite/pridružite organizaciji.");
  console.log(`Placeholder userId reserved for docs: ${userId}, memberId: ${memberId}`);

  process.exit(0);
}

seed().catch((error: unknown) => {
  console.error("Seed spodletel:", error instanceof Error ? error.message : error);
  process.exit(1);
});
