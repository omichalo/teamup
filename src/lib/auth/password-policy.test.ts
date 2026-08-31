import {
  containsFirebaseSpecialCharacter,
  FIREBASE_ALLOWED_SPECIAL_CHARACTERS,
} from "./password-policy";

describe("containsFirebaseSpecialCharacter", () => {
  it("accepte les caractères spéciaux listés par Firebase", () => {
    for (const char of FIREBASE_ALLOWED_SPECIAL_CHARACTERS) {
      expect(containsFirebaseSpecialCharacter(`Abcdefghijkl${char}`)).toBe(true);
    }
  });

  it("rejette les caractères hors liste Firebase", () => {
    expect(containsFirebaseSpecialCharacter("Abcdefghijkl+")).toBe(false);
    expect(containsFirebaseSpecialCharacter("Abcdefghijkl=")).toBe(false);
    expect(containsFirebaseSpecialCharacter("Abcdefghijklé")).toBe(false);
    expect(containsFirebaseSpecialCharacter("Abcdefghijkl€")).toBe(false);
  });
});
