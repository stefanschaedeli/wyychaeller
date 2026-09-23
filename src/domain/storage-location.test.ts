import { describe, expect, it } from "vitest";
import {
  buildPlacementKey,
  describePlacement,
  formatRowLabel,
  formatSlotLabel,
  NAMED_SLOT_LABELS,
  requiredSlotsPerRow,
  UNPLACED_LABEL,
  type StorageLocationShape,
} from "./storage-location";

function buildGridShape(overrides: Partial<StorageLocationShape> = {}): StorageLocationShape {
  return {
    name: "Weinschrank",
    kind: "grid",
    rowCount: 5,
    slotsPerRow: 2,
    slotLabelStyle: "leftRight",
    ...overrides,
  };
}

function buildSimpleShape(overrides: Partial<StorageLocationShape> = {}): StorageLocationShape {
  return {
    name: "Regal 1",
    kind: "simple",
    rowCount: null,
    slotsPerRow: null,
    slotLabelStyle: null,
    ...overrides,
  };
}

describe("requiredSlotsPerRow", () => {
  it("returns two slots for leftRight", () => {
    expect(requiredSlotsPerRow("leftRight")).toBe(2);
  });

  it("returns three slots for leftMiddleRight", () => {
    expect(requiredSlotsPerRow("leftMiddleRight")).toBe(3);
  });

  it("returns null for numbered, since any slot count is allowed", () => {
    expect(requiredSlotsPerRow("numbered")).toBeNull();
  });
});

describe("formatRowLabel", () => {
  it("formats a row index as 'Reihe <row>'", () => {
    expect(formatRowLabel(2)).toBe("Reihe 2");
  });
});

describe("formatSlotLabel", () => {
  it("formats a numbered slot as 'Platz <slot>'", () => {
    expect(formatSlotLabel("numbered", 3)).toBe("Platz 3");
  });

  it("formats a leftRight slot from NAMED_SLOT_LABELS", () => {
    expect(formatSlotLabel("leftRight", 1)).toBe("links");
    expect(formatSlotLabel("leftRight", 2)).toBe("rechts");
  });

  it("formats a leftMiddleRight slot from NAMED_SLOT_LABELS", () => {
    expect(formatSlotLabel("leftMiddleRight", 2)).toBe(NAMED_SLOT_LABELS.leftMiddleRight?.[1]);
  });
});

describe("describePlacement", () => {
  it("describes a grid placement as '<location>, Reihe <row>, <slot label>'", () => {
    const position = { locationId: 1, rowIndex: 2, slotIndex: 1, freeText: null };
    expect(describePlacement(position, buildGridShape())).toBe("Weinschrank, Reihe 2, links");
  });

  it("describes a simple location placement as the location name", () => {
    const position = { locationId: 2, rowIndex: null, slotIndex: null, freeText: null };
    expect(describePlacement(position, buildSimpleShape())).toBe("Regal 1");
  });

  it("describes a free text placement as the text itself", () => {
    const position = { locationId: null, rowIndex: null, slotIndex: null, freeText: "Keller" };
    expect(describePlacement(position, null)).toBe("Keller");
  });

  it("describes an unplaced position with UNPLACED_LABEL", () => {
    const position = { locationId: null, rowIndex: null, slotIndex: null, freeText: null };
    expect(describePlacement(position, null)).toBe(UNPLACED_LABEL);
  });
});

describe("buildPlacementKey", () => {
  it("builds a grid slot key", () => {
    const position = { locationId: 3, rowIndex: 2, slotIndex: 1, freeText: null };
    expect(buildPlacementKey(position)).toBe("location:3:2:1");
  });

  it("builds a simple location key with null row and slot", () => {
    const position = { locationId: 3, rowIndex: null, slotIndex: null, freeText: null };
    expect(buildPlacementKey(position)).toBe("location:3");
  });

  it("builds a normalised free text key", () => {
    const position = { locationId: null, rowIndex: null, slotIndex: null, freeText: "Château" };
    expect(buildPlacementKey(position)).toBe("text:chateau");
  });

  it("builds the unplaced key", () => {
    const position = { locationId: null, rowIndex: null, slotIndex: null, freeText: null };
    expect(buildPlacementKey(position)).toBe("unplaced");
  });
});
