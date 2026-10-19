import { describe, expect, it } from "vitest";
import { decodeRoles } from "./token";

function fakeToken(payload: unknown) {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encode({ alg: "RS256" })}.${encode(payload)}.signature`;
}

describe("decodeRoles", () => {
  it("reads the roles claim", () => {
    expect(decodeRoles(fakeToken({ roles: ["Items.Read", "Items.Write"] }))).toEqual(["Items.Read", "Items.Write"]);
  });

  it("returns nothing when there is no roles claim", () => {
    expect(decodeRoles(fakeToken({ scp: "access_as_user" }))).toEqual([]);
  });

  it("ignores a roles claim that is not a list of strings", () => {
    expect(decodeRoles(fakeToken({ roles: "Items.Read" }))).toEqual([]);
    expect(decodeRoles(fakeToken({ roles: ["Items.Read", 7, null] }))).toEqual(["Items.Read"]);
  });

  it("survives garbage without throwing", () => {
    expect(decodeRoles("not-a-token")).toEqual([]);
    expect(decodeRoles("a.b.c")).toEqual([]);
    expect(decodeRoles("")).toEqual([]);
  });
});
