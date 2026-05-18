import { extractPostcodeCityFromLabel } from "./ban";

describe("extractPostcodeCityFromLabel", () => {
  it("extrait CP et commune en fin de libellé BAN", () => {
    expect(extractPostcodeCityFromLabel("1 Mail Thérèse Desqueyroux 78280 Guyancourt")).toEqual({
      postcode: "78280",
      city: "Guyancourt",
    });
  });
});
