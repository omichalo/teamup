import { describe, expect, it } from "@jest/globals";
import {
  buildListedLicenceSet,
  normalizePlayerLicence,
} from "./player-archive";

describe("normalizePlayerLicence", () => {
  it("retire les caractères non numériques", () => {
    expect(normalizePlayerLicence("78-99001")).toBe("7899001");
    expect(normalizePlayerLicence("")).toBe("");
  });
});

describe("buildListedLicenceSet", () => {
  it("normalise et déduplique les licences listées", () => {
    const listed = buildListedLicenceSet(["7899001", "78-99002", "7899001", ""]);
    expect([...listed]).toEqual(["7899001", "7899002"]);
  });
});
