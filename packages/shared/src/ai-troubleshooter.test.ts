import { describe, expect, it } from "vitest";
import { heuristicServiceReportDraft, heuristicTroubleshooting } from "./ai-troubleshooter";

describe("ai-troubleshooter heuristics", () => {
  it("generates CCTV diagnosis for offline symptoms", () => {
    const draft = heuristicTroubleshooting({
      ticketTitle: "Kamera offline",
      faultDescription: "Kamera je offline in se ne odziva",
      category: "cctv",
    });

    expect(draft.headline.toLowerCase()).toContain("kamera");
    expect(draft.likelyCauses.length).toBeGreaterThan(0);
    expect(draft.nextChecks.join(" ").toLowerCase()).toContain("rtsp");
  });

  it("generates generic diagnosis for non-cctv tickets", () => {
    const draft = heuristicTroubleshooting({
      ticketTitle: "Splošna težava",
      faultDescription: "Service timeout",
      category: "alarm",
    });
    expect(draft.headline.toLowerCase()).toContain("diagnost");
    expect(draft.recommendedActions.length).toBeGreaterThan(0);
  });

  it("creates service report draft content", () => {
    const report = heuristicServiceReportDraft({
      ticketTitle: "Kamera black",
      faultDescription: "Video je črn, brez slike",
      workPerformed: "Ponovno zagnali smo stream storitev",
      category: "cctv",
    });

    expect(report.findings.length).toBeGreaterThan(10);
    expect(report.recommendations.length).toBeGreaterThan(10);
    expect(report.customerSummary.length).toBeGreaterThan(10);
  });
});

