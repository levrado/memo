import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { PROPERTY_TYPE_ICON, PROPERTY_TYPE_LABEL } from "./property-icons";

/**
 * Structural consistency test: PROPERTY_TYPE_ICON and PROPERTY_TYPE_LABEL must
 * stay in sync with the PropertyType union. The union is compile-time-only, so
 * the members are parsed from src/lib/types.ts — adding a type without an
 * icon/label, or leaving a stale entry after removing a type, fails here.
 */
function propertyTypesFromSource(): string[] {
  const source = readFileSync(join(__dirname, "types.ts"), "utf8");
  const declaration = source.match(
    /export\s+type\s+PropertyType\s*=\s*([\s\S]*?);/,
  );
  if (!declaration) {
    throw new Error("could not find `export type PropertyType` in types.ts");
  }
  return [...declaration[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const propertyTypes = propertyTypesFromSource();

describe("PropertyType source parsing", () => {
  it("finds at least one member in the PropertyType union", () => {
    expect(propertyTypes.length).toBeGreaterThan(0);
  });
});

describe("PROPERTY_TYPE_ICON", () => {
  it("has an entry for every PropertyType and no extras", () => {
    expect(Object.keys(PROPERTY_TYPE_ICON).sort()).toEqual(
      [...propertyTypes].sort(),
    );
  });

  it("maps every type to a defined icon component", () => {
    for (const icon of Object.values(PROPERTY_TYPE_ICON)) {
      expect(icon).toBeTruthy();
    }
  });
});

describe("PROPERTY_TYPE_LABEL", () => {
  it("has an entry for every PropertyType and no extras", () => {
    expect(Object.keys(PROPERTY_TYPE_LABEL).sort()).toEqual(
      [...propertyTypes].sort(),
    );
  });

  it("maps every type to a non-empty label", () => {
    for (const label of Object.values(PROPERTY_TYPE_LABEL)) {
      expect(typeof label).toBe("string");
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });
});
