import { config } from "dotenv";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createDb } from "./client";
import { PLANS, createQrToken } from "@securitydesk/shared";

config({ path: resolve(process.cwd(), "../../.env.local") });
config({ path: resolve(process.cwd(), ".env.local") });

/**
 * DEMO SEED — development only.
 * Credentials are intentionally weak and MUST NOT be used in production.
 */
async function seed() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    console.error(
      "Seed je onemogočen v produkciji. Nastavite ALLOW_PROD_SEED=true samo za kontrolirane demo okolja.",
    );
    process.exit(1);
  }

  const { db, schema, provider } = createDb();
  console.log(`Seeding (${provider})…`);

  const orgId = randomUUID();
  const now = new Date();

  await db.insert(schema.organization).values({
    id: orgId,
    name: "Aktiva Demo",
    slug: `aktiva-demo-${Date.now()}`,
    planId: "integrator",
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(schema.subscription).values({
    id: randomUUID(),
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
    id: randomUUID(),
    organizationId: orgId,
    locale: "sl",
    timezone: "Europe/Ljubljana",
    brandPrimaryColor: "#1d4ed8",
    createdAt: now,
    updatedAt: now,
  });

  const customerA = randomUUID();
  const customerB = randomUUID();
  await db.insert(schema.customer).values([
    {
      id: customerA,
      organizationId: orgId,
      name: "Logistika Maribor d.o.o.",
      taxId: "SI12345678",
      city: "Maribor",
      country: "SI",
      email: "info@logistika-demo.si",
      status: "active",
      collaborationStartedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: customerB,
      organizationId: orgId,
      name: "Hotel Adriatic",
      taxId: "SI87654321",
      city: "Portorož",
      country: "SI",
      email: "it@hotel-adriatic-demo.si",
      status: "active",
      collaborationStartedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const site1 = randomUUID();
  const site2 = randomUUID();
  const site3 = randomUUID();
  await db.insert(schema.site).values([
    {
      id: site1,
      organizationId: orgId,
      customerId: customerA,
      name: "Skladišče Tezno",
      city: "Maribor",
      timezone: "Europe/Ljubljana",
      qrToken: createQrToken(),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: site2,
      organizationId: orgId,
      customerId: customerA,
      name: "Pisarna center",
      city: "Maribor",
      timezone: "Europe/Ljubljana",
      qrToken: createQrToken(),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: site3,
      organizationId: orgId,
      customerId: customerB,
      name: "Hotel glavna stavba",
      city: "Portorož",
      timezone: "Europe/Ljubljana",
      qrToken: createQrToken(),
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const buildingId = randomUUID();
  const floorId = randomUUID();
  const roomId = randomUUID();
  await db.insert(schema.building).values({
    id: buildingId,
    organizationId: orgId,
    siteId: site1,
    name: "Hala A",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(schema.floor).values({
    id: floorId,
    organizationId: orgId,
    buildingId,
    name: "Pritličje",
    level: 0,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(schema.room).values({
    id: roomId,
    organizationId: orgId,
    floorId,
    name: "Strežniška",
    createdAt: now,
    updatedAt: now,
  });

  const axisId = randomUUID();
  const hikId = randomUUID();
  await db.insert(schema.manufacturer).values([
    { id: axisId, organizationId: orgId, name: "Axis", createdAt: now, updatedAt: now },
    { id: hikId, organizationId: orgId, name: "Hikvision", createdAt: now, updatedAt: now },
  ]);

  const camType = randomUUID();
  const nvrType = randomUUID();
  const switchType = randomUUID();
  await db.insert(schema.deviceType).values([
    { id: camType, organizationId: orgId, name: "IP kamera", category: "cctv", createdAt: now, updatedAt: now },
    { id: nvrType, organizationId: orgId, name: "Snemalnik", category: "cctv", createdAt: now, updatedAt: now },
    { id: switchType, organizationId: orgId, name: "Stikalo", category: "network", createdAt: now, updatedAt: now },
  ]);

  const devices = [
    { name: "Kamera skladišče 1", ip: "192.168.10.11", siteId: site1, type: camType, mfr: axisId },
    { name: "Kamera skladišče 2", ip: "192.168.10.12", siteId: site1, type: camType, mfr: axisId },
    { name: "Kamera rampa", ip: "192.168.10.13", siteId: site1, type: camType, mfr: hikId },
    { name: "NVR glavni", ip: "192.168.10.20", siteId: site1, type: nvrType, mfr: hikId },
    { name: "Cisco SW-01", ip: "192.168.10.1", siteId: site1, type: switchType, mfr: null },
    { name: "2N IP Verso", ip: "192.168.10.30", siteId: site1, type: null, mfr: null },
    { name: "Grandstream GXV", ip: "192.168.10.31", siteId: site1, type: null, mfr: null },
    { name: "Strežnik VMS", ip: "192.168.10.50", siteId: site1, type: null, mfr: null, roomId },
    { name: "Kamera pisarna", ip: "192.168.20.11", siteId: site2, type: camType, mfr: axisId },
    { name: "Kamera hodnik", ip: "192.168.20.12", siteId: site2, type: camType, mfr: hikId },
    { name: "Kamera recepcija", ip: "192.168.30.11", siteId: site3, type: camType, mfr: axisId },
    { name: "Kamera parkirišče", ip: "192.168.30.12", siteId: site3, type: camType, mfr: hikId },
    { name: "Kamera bazen", ip: "192.168.30.13", siteId: site3, type: camType, mfr: hikId },
    { name: "NVR hotel", ip: "192.168.30.20", siteId: site3, type: nvrType, mfr: hikId },
    { name: "SW hotel PoE", ip: "192.168.30.1", siteId: site3, type: switchType, mfr: null },
    { name: "Kamera streha", ip: "192.168.30.14", siteId: site3, type: camType, mfr: axisId },
    { name: "Kamera kuhinja", ip: "192.168.30.15", siteId: site3, type: camType, mfr: hikId },
    { name: "Kamera skladišče hotela", ip: "192.168.30.16", siteId: site3, type: camType, mfr: axisId },
    { name: "UPS strežniška", ip: "192.168.10.60", siteId: site1, type: null, mfr: null },
    { name: "Kamera offline demo", ip: "192.168.10.99", siteId: site1, type: camType, mfr: hikId },
  ];

  for (const d of devices) {
    await db.insert(schema.device).values({
      id: randomUUID(),
      organizationId: orgId,
      customerId: d.siteId === site3 ? customerB : customerA,
      siteId: d.siteId,
      roomId: "roomId" in d ? roomId : null,
      deviceTypeId: d.type,
      manufacturerId: d.mfr,
      name: d.name,
      ipAddress: d.ip,
      status: d.name.includes("offline") ? "inactive" : "active",
      qrToken: createQrToken(),
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
  }

  const ticketId = randomUUID();
  await db.insert(schema.serviceTicket).values({
    id: ticketId,
    organizationId: orgId,
    customerId: customerA,
    siteId: site1,
    title: "Kamera offline – vhod",
    description: "Kamera na vhodu ne odgovarja na ping. Stranka poroča o črnem zaslonu v VMS.",
    category: "cctv",
    priority: "high",
    status: "open",
    createdAt: now,
    updatedAt: now,
  });

  const handoverId = randomUUID();
  await db.insert(schema.handoverPackage).values({
    id: handoverId,
    organizationId: orgId,
    customerId: customerA,
    siteId: site1,
    title: "Predaja – Skladišče A",
    description: "Digitalna predaja videonadzornega sistema.",
    status: "draft",
    deviceSummary: "NVR glavni\nKamera vhod\nKamera skladišče",
    ipTable: "192.168.10.10 · NVR\n192.168.10.11 · Kamera vhod",
    serviceContacts: "Servis: +386 1 234 5678",
    publicToken: randomUUID().replace(/-/g, ""),
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  const checklist = [
    { key: "system_installed", label: "Sistem je nameščen" },
    { key: "devices_tested", label: "Naprave so testirane" },
    { key: "recording_works", label: "Snemanje deluje" },
    { key: "time_synced", label: "Čas je sinhroniziran" },
    { key: "users_ready", label: "Uporabniki so pripravljeni" },
    { key: "customer_instructions", label: "Stranka je prejela navodila" },
    { key: "passwords_secure", label: "Gesla so bila predana po varnem kanalu" },
    { key: "training_done", label: "Usposabljanje je izvedeno" },
  ];
  for (const [index, item] of checklist.entries()) {
    await db.insert(schema.handoverChecklistItem).values({
      id: randomUUID(),
      organizationId: orgId,
      packageId: handoverId,
      itemKey: item.key,
      label: item.label,
      checked: index < 2,
      sortOrder: index,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.insert(schema.dashboardStat).values({
    id: randomUUID(),
    organizationId: orgId,
    customersCount: 2,
    sitesCount: 3,
    devicesCount: devices.length,
    openTicketsCount: 1,
    onlineDevicesCount: devices.length - 1,
    offlineDevicesCount: 1,
    updatedAt: now,
  });

  console.log("Seed dokončan.");
  console.log(`Organizacija: Aktiva Demo (${orgId})`);
  console.log("2 stranki, 3 objekti, ~20 naprav, odprt servisni zahtevek, predajni paket.");
  console.log("Naslednji korak: registracija v aplikaciji in povezava z organizacijo / ročni preizkus CRUD.");
  process.exit(0);
}

seed().catch((error: unknown) => {
  console.error("Seed spodletel:", error instanceof Error ? error.message : error);
  process.exit(1);
});
