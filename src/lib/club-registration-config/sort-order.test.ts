import {
  moveArrayItem,
  moveBySortOrder,
  reorderBySortOrder,
  sortBySortOrder,
} from "./sort-order";

describe("sort-order", () => {
  it("sortBySortOrder trie par sortOrder croissant", () => {
    const items = [
      { id: "b", sortOrder: 2 },
      { id: "a", sortOrder: 0 },
      { id: "c", sortOrder: 1 },
    ];
    expect(sortBySortOrder(items).map((item) => item.id)).toEqual(["a", "c", "b"]);
  });

  it("reorderBySortOrder déplace un élément et renumérote", () => {
    const items = [
      { id: "a", sortOrder: 0 },
      { id: "b", sortOrder: 1 },
      { id: "c", sortOrder: 2 },
    ];
    const moved = reorderBySortOrder(items, 2, -1);
    expect(moved.map((item) => item.id)).toEqual(["a", "c", "b"]);
    expect(moved.map((item) => item.sortOrder)).toEqual([0, 1, 2]);
  });

  it("moveArrayItem déplace un élément par drag & drop", () => {
    const items = ["a", "b", "c", "d"];
    expect(moveArrayItem(items, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveArrayItem(items, 3, 0)).toEqual(["d", "a", "b", "c"]);
  });

  it("moveBySortOrder réordonne avec sortOrder désordonné", () => {
    const items = [
      { id: "a", sortOrder: 2 },
      { id: "b", sortOrder: 0 },
      { id: "c", sortOrder: 1 },
    ];
    const moved = moveBySortOrder(items, 0, 2);
    expect(moved.map((item) => item.id)).toEqual(["c", "a", "b"]);
    expect(moved.map((item) => item.sortOrder)).toEqual([0, 1, 2]);
  });
});
