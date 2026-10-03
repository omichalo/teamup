import { listMarksForRegistration } from "./list-marks-for-registration";
import { mapMarkDoc } from "./store";

describe("listMarksForRegistration", () => {
  it("interroge registrationId + orderBy date et mappe les documents", async () => {
    const docs = [
      {
        id: "m1",
        data: () => ({
          date: "2026-09-01",
          slotId: "slot-a",
          siteId: "site",
          seasonLabel: "2026-2027",
          sessionId: "s1",
          kind: "enrolled",
          registrationId: "reg-1",
          displayName: "Ada",
          markedAt: "2026-09-01T18:00:00.000Z",
          markedByUid: "u1",
        }),
      },
    ];

    const get = jest.fn().mockResolvedValue({ docs });
    const orderBy = jest.fn().mockReturnValue({ get });
    const where = jest.fn().mockReturnValue({ orderBy });
    const collection = jest.fn().mockReturnValue({ where });
    const db = { collection } as never;

    const marks = await listMarksForRegistration(db, "reg-1");

    expect(collection).toHaveBeenCalledWith("attendanceMarks");
    expect(where).toHaveBeenCalledWith("registrationId", "==", "reg-1");
    expect(orderBy).toHaveBeenCalledWith("date", "asc");
    expect(marks).toHaveLength(1);
    expect(marks[0]).toEqual(mapMarkDoc("m1", docs[0]!.data()));
  });
});
