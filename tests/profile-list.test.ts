import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  groupProfileProjectsByRole,
  type ProfileProject,
} from "@/lib/profile/list";

function project(overrides: Partial<ProfileProject> & { _id: string }): ProfileProject {
  return {
    name: overrides._id,
    projectStage: "pilot",
    isDeliveryOwner: false,
    isAdditionalDeliveryOwner: false,
    isBusinessLead: false,
    isLegalLead: false,
    ...overrides,
  };
}

describe("groupProfileProjectsByRole", () => {
  it("returns empty arrays for every role when no projects", () => {
    const result = groupProfileProjectsByRole([]);
    expect(result.deliveryOwner).toEqual([]);
    expect(result.additionalDeliveryOwner).toEqual([]);
    expect(result.businessLead).toEqual([]);
    expect(result.legalLead).toEqual([]);
  });

  it("places a project under every role flag that is true", () => {
    const result = groupProfileProjectsByRole([
      project({ _id: "p1", isDeliveryOwner: true, isBusinessLead: true }),
    ]);
    expect(result.deliveryOwner.map((p) => p._id)).toEqual(["p1"]);
    expect(result.businessLead.map((p) => p._id)).toEqual(["p1"]);
    expect(result.additionalDeliveryOwner).toEqual([]);
    expect(result.legalLead).toEqual([]);
  });

  it("does not duplicate within a single role", () => {
    const result = groupProfileProjectsByRole([
      project({ _id: "p1", isDeliveryOwner: true }),
      project({ _id: "p2", isDeliveryOwner: true }),
    ]);
    expect(result.deliveryOwner.map((p) => p._id)).toEqual(["p1", "p2"]);
  });

  it("preserves input order within a role", () => {
    const result = groupProfileProjectsByRole([
      project({ _id: "z", isDeliveryOwner: true }),
      project({ _id: "a", isDeliveryOwner: true }),
    ]);
    expect(result.deliveryOwner.map((p) => p._id)).toEqual(["z", "a"]);
  });
});
