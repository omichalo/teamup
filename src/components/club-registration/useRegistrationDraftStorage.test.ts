/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useRegistrationDraftStorage } from "./useRegistrationDraftStorage";
import { createEmptyDraft } from "./registration-defaults";

const STORAGE_KEY = "teamup:club-registration:v1";
const DISABLED_KEY = "teamup:club-registration:storage-disabled";

describe("useRegistrationDraftStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("save écrit en localStorage après debounce, load relit", () => {
    const { result } = renderHook(() => useRegistrationDraftStorage());

    const draft = { ...createEmptyDraft(), firstName: "Olivier" };
    act(() => {
      result.current.save(draft);
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    act(() => {
      jest.advanceTimersByTime(600);
    });

    const stored = window.localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const reloaded = result.current.load();
    expect(reloaded?.firstName).toBe("Olivier");
  });

  it("saveNow écrit immédiatement", () => {
    const { result } = renderHook(() => useRegistrationDraftStorage());

    const draft = { ...createEmptyDraft(), firstName: "Marie" };
    act(() => {
      result.current.saveNow(draft);
    });

    const stored = window.localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).draft.firstName).toBe("Marie");
  });

  it("clear supprime le brouillon stocké", () => {
    const { result } = renderHook(() => useRegistrationDraftStorage());

    act(() => {
      result.current.saveNow({ ...createEmptyDraft(), firstName: "X" });
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    act(() => {
      result.current.clear();
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("disable empêche la sauvegarde et efface l'existant", () => {
    const { result } = renderHook(() => useRegistrationDraftStorage());

    act(() => {
      result.current.saveNow({ ...createEmptyDraft(), firstName: "Camille" });
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    act(() => {
      result.current.disable();
    });
    expect(result.current.isDisabled).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(DISABLED_KEY)).toBe("1");

    act(() => {
      result.current.saveNow({ ...createEmptyDraft(), firstName: "Y" });
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("enable réactive la sauvegarde", () => {
    const { result } = renderHook(() => useRegistrationDraftStorage());

    act(() => {
      result.current.disable();
    });
    expect(result.current.isDisabled).toBe(true);

    act(() => {
      result.current.enable();
    });
    expect(result.current.isDisabled).toBe(false);

    act(() => {
      result.current.saveNow({ ...createEmptyDraft(), firstName: "Z" });
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("load retourne null si la version stockée diffère et nettoie l'entrée", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 99, draft: { firstName: "Old" }, updatedAt: "now" })
    );
    const { result } = renderHook(() => useRegistrationDraftStorage());

    const reloaded = result.current.load();
    expect(reloaded).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("load retourne null si désactivé même avec une entrée présente", () => {
    window.localStorage.setItem(DISABLED_KEY, "1");
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        draft: createEmptyDraft(),
        updatedAt: "now",
      })
    );
    const { result } = renderHook(() => useRegistrationDraftStorage());

    expect(result.current.load()).toBeNull();
  });
});
