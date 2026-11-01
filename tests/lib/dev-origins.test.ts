import { describe, expect, it } from "vitest";
import { parseAllowedDevOrigins } from "@/lib/dev-origins";

describe("parseAllowedDevOrigins", () => {
  it("returns nothing when the variable is unset or blank", () => {
    expect(parseAllowedDevOrigins(undefined)).toEqual([]);
    expect(parseAllowedDevOrigins("")).toEqual([]);
    expect(parseAllowedDevOrigins(" , ,")).toEqual([]);
  });

  it("splits on commas, trims and drops empty entries", () => {
    expect(
      parseAllowedDevOrigins(" thiep.example.com ,, 203.0.113.7 ,preview.example.org,"),
    ).toEqual(["thiep.example.com", "203.0.113.7", "preview.example.org"]);
  });

  it("accepts the wildcards Next understands", () => {
    expect(
      parseAllowedDevOrigins("*.example.com,**.example.net,a.*.example.org"),
    ).toEqual(["*.example.com", "**.example.net", "a.*.example.org"]);
  });

  it.each([
    "https://thiep.example.com",
    "thiep.example.com:443",
    "thiep.example.com/w/demo",
    "thiep .example.com",
    "team-*.example.com",
    "a.**.example.com",
    "thiep..example.com",
    "*",
    "**",
    "*.*",
  ])("rejects %s, which Next would never match", (entry) => {
    expect(() =>
      parseAllowedDevOrigins(`thiep.example.com,${entry}`),
    ).toThrow(`ALLOWED_DEV_ORIGINS: "${entry}"`);
  });
});
