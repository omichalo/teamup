import { attendancePickerHref, attendanceSessionHref } from "./urls";

describe("attendance urls", () => {
  it("construit le picker et la séance", () => {
    expect(attendancePickerHref()).toBe("/club/presences");
    expect(attendancePickerHref("2026-08-20")).toBe("/club/presences?date=2026-08-20");
    expect(attendanceSessionHref("2026-08-20", "voisins-jeu-1900-adultes-elite")).toBe(
      "/club/presences/seance?date=2026-08-20&slot=voisins-jeu-1900-adultes-elite"
    );
  });
});
