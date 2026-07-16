import { describe, expect, it } from "vitest";
import {
  DEFAULT_HANDOVER_CHECKLIST,
  handoverPackageInputSchema,
  parseOptionalDate,
  serviceTicketInputSchema,
  workOrderInputSchema,
} from "./service";

describe("service schemas", () => {
  it("validates a service ticket", () => {
    const parsed = serviceTicketInputSchema.parse({
      title: "Kamera offline",
      customerId: "cust-1",
      priority: "high",
      category: "cctv",
    });
    expect(parsed.status).toBe("open");
    expect(parsed.priority).toBe("high");
  });

  it("validates work order materials", () => {
    const parsed = workOrderInputSchema.parse({
      ticketId: "t-1",
      materials: [{ name: "RJ45", quantity: 2, unit: "kos" }],
    });
    expect(parsed.materials).toHaveLength(1);
    expect(parsed.status).toBe("planned");
  });

  it("requires handover title and customer", () => {
    const result = handoverPackageInputSchema.safeParse({ title: "", customerId: "" });
    expect(result.success).toBe(false);
  });

  it("has default checklist with 8 items", () => {
    expect(DEFAULT_HANDOVER_CHECKLIST).toHaveLength(8);
    expect(DEFAULT_HANDOVER_CHECKLIST[0]?.key).toBe("system_installed");
  });

  it("parses optional dates", () => {
    expect(parseOptionalDate("")).toBeNull();
    expect(parseOptionalDate("2026-07-16T10:00")).toBeInstanceOf(Date);
  });
});
