import { renderHook, act } from "@testing-library/react";
import { useTouchedFields } from "./useTouchedFields";

describe("useTouchedFields", () => {
  it("retourne false avant tout markTouched", () => {
    const { result } = renderHook(() => useTouchedFields());
    expect(result.current.isTouched("foo")).toBe(false);
  });

  it("marque un champ comme touched et retourne true uniquement pour lui", () => {
    const { result } = renderHook(() => useTouchedFields());
    act(() => result.current.markTouched("foo"));
    expect(result.current.isTouched("foo")).toBe(true);
    expect(result.current.isTouched("bar")).toBe(false);
  });

  it("markAll active la sortie true sur tous les champs", () => {
    const { result } = renderHook(() => useTouchedFields());
    expect(result.current.isTouched("baz")).toBe(false);
    act(() => result.current.markAll());
    expect(result.current.isTouched("foo")).toBe(true);
    expect(result.current.isTouched("anything")).toBe(true);
  });

  it("reset remet à zéro le set des champs touchés", () => {
    const { result } = renderHook(() => useTouchedFields());
    act(() => result.current.markTouched("foo"));
    act(() => result.current.markAll());
    expect(result.current.isTouched("foo")).toBe(true);
    act(() => result.current.reset());
    expect(result.current.isTouched("foo")).toBe(false);
    expect(result.current.isTouched("bar")).toBe(false);
  });

  it("markTouched est idempotent (pas de set si déjà touché)", () => {
    const { result } = renderHook(() => useTouchedFields());
    act(() => result.current.markTouched("foo"));
    const firstRef = result.current.isTouched;
    act(() => result.current.markTouched("foo"));
    expect(result.current.isTouched("foo")).toBe(true);
    // Le callback isTouched est stable tant que touched/allTouched n'ont pas changé.
    expect(result.current.isTouched).toBe(firstRef);
  });
});
