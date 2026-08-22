import { omitUndefinedFields } from "./omit-undefined-fields";

describe("omitUndefinedFields", () => {
  it("drops top-level undefined without touching null or false", () => {
    expect(
      omitUndefinedFields({
        championnat: true,
        hasPlayedAtLeastOneMatch: undefined,
        registrationId: null,
        coachExcluded: false,
      })
    ).toEqual({
      championnat: true,
      registrationId: null,
      coachExcluded: false,
    });
  });
});
