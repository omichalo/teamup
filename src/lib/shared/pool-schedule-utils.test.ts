import {
  buildUpcomingPoolSchedule,
  groupPoolScheduleByJournee,
  isRencontrePlayed,
  isRencontreUpcoming,
} from "./pool-schedule-utils";

describe("isRencontrePlayed", () => {
  it("returns false when scores are null or 0-0", () => {
    expect(isRencontrePlayed({ scoreEquipeA: null, scoreEquipeB: null })).toBe(false);
    expect(isRencontrePlayed({ scoreEquipeA: 0, scoreEquipeB: 0 })).toBe(false);
  });

  it("returns true when at least one team scored", () => {
    expect(isRencontrePlayed({ scoreEquipeA: 11, scoreEquipeB: 0 })).toBe(true);
  });
});

describe("isRencontreUpcoming", () => {
  const today = new Date("2026-06-03T12:00:00");

  it("excludes unplayed rencontres with a past date", () => {
    expect(
      isRencontreUpcoming(
        {
          nomEquipeA: "A",
          nomEquipeB: "B",
          scoreEquipeA: null,
          scoreEquipeB: null,
          lien: "tour=2",
          libelle: "tour n°2",
          datePrevue: new Date("2026-02-13"),
        },
        1,
        today
      )
    ).toBe(false);
  });

  it("includes unplayed rencontres with a future date", () => {
    expect(
      isRencontreUpcoming(
        {
          nomEquipeA: "A",
          nomEquipeB: "B",
          scoreEquipeA: 0,
          scoreEquipeB: 0,
          lien: "tour=7",
          libelle: "tour n°7",
          datePrevue: new Date("2026-06-05"),
        },
        6,
        today
      )
    ).toBe(true);
  });
});

describe("buildUpcomingPoolSchedule", () => {
  const now = new Date("2026-06-03T12:00:00");

  it("keeps only upcoming unplayed rencontres sorted by journee", () => {
    const raw = [
      {
        nomEquipeA: "SQY PING A",
        nomEquipeB: "CLUB B",
        scoreEquipeA: 11,
        scoreEquipeB: 5,
        lien: "tour=1",
        libelle: "tour n°1",
      },
      {
        nomEquipeA: "CLUB C",
        nomEquipeB: "CLUB D",
        scoreEquipeA: null,
        scoreEquipeB: null,
        lien: "tour=2",
        libelle: "tour n°2",
        datePrevue: new Date("2026-02-13"),
      },
      {
        nomEquipeA: "CLUB E",
        nomEquipeB: "CLUB F",
        scoreEquipeA: null,
        scoreEquipeB: null,
        lien: "tour=7",
        libelle: "tour n°7",
        datePrevue: new Date("2026-06-05"),
      },
      {
        nomEquipeA: "SQY PING A",
        nomEquipeB: "CLUB G",
        scoreEquipeA: 0,
        scoreEquipeB: 0,
        lien: "tour=7",
        libelle: "tour n°7",
        datePrevue: new Date("2026-06-05"),
      },
    ];

    const schedule = buildUpcomingPoolSchedule(raw, { now });
    expect(schedule).toHaveLength(2);
    expect(schedule.every((m) => m.journee === 7)).toBe(true);
    expect(schedule[1]?.involvesSqyPing).toBe(true);
  });

  it("includes undated rencontres only after the last played journee", () => {
    const raw = [
      {
        nomEquipeA: "A",
        nomEquipeB: "B",
        scoreEquipeA: 10,
        scoreEquipeB: 8,
        lien: "tour=5",
        libelle: "tour n°5",
      },
      {
        nomEquipeA: "C",
        nomEquipeB: "D",
        scoreEquipeA: null,
        scoreEquipeB: null,
        lien: "tour=6",
        libelle: "tour n°6",
      },
      {
        nomEquipeA: "E",
        nomEquipeB: "F",
        scoreEquipeA: null,
        scoreEquipeB: null,
        lien: "tour=3",
        libelle: "tour n°3",
      },
    ];

    const schedule = buildUpcomingPoolSchedule(raw, { now });
    expect(schedule.map((m) => m.journee)).toEqual([6]);
  });
});

describe("groupPoolScheduleByJournee", () => {
  it("groups matches by journee number", () => {
    const grouped = groupPoolScheduleByJournee([
      {
        journee: 2,
        nomEquipeA: "A",
        nomEquipeB: "B",
        date: null,
        score: null,
        involvesSqyPing: false,
      },
      {
        journee: 2,
        nomEquipeA: "C",
        nomEquipeB: "D",
        date: null,
        score: null,
        involvesSqyPing: false,
      },
    ]);
    expect(grouped.get(2)).toHaveLength(2);
  });
});
