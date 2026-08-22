import { unlistedMirrorFieldsFromFfttDetails } from "./unlisted-player-mirror";

describe("unlistedMirrorFieldsFromFfttDetails", () => {
  it("keeps a mutation club and its current licence type", () => {
    expect(
      unlistedMirrorFieldsFromFfttDetails({
        nomClub: "CHESNAY 78 AS",
        numClub: "08780080",
        typeLicence: "T",
      })
    ).toEqual({
      nomClub: "CHESNAY 78 AS",
      numClub: "08780080",
      club: "CHESNAY 78 AS",
      typeLicence: "T",
    });
  });

  it("clears a leftover SQY type when FFTT has no season licence", () => {
    expect(
      unlistedMirrorFieldsFromFfttDetails({
        nomClub: "SQY PING",
        typeLicence: null,
      })
    ).toEqual({
      nomClub: "SQY PING",
      numClub: "",
      club: "SQY PING",
      typeLicence: "",
    });
  });
});
