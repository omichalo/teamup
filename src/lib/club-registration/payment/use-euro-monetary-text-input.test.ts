import { renderHook, act } from "@testing-library/react";
import type { FocusEvent } from "react";
import { useEuroMonetaryTextInput } from "./use-euro-monetary-text-input";

describe("useEuroMonetaryTextInput", () => {
  it("conserve la saisie entière en cours sans formater (ex. 5 puis 50)", () => {
    const { result } = renderHook(() =>
      useEuroMonetaryTextInput({ amountCents: 0, allowEmpty: true })
    );

    act(() => {
      result.current.handleChange("5");
    });
    expect(result.current.text).toBe("5");

    act(() => {
      result.current.handleChange("50");
    });
    expect(result.current.text).toBe("50");
  });

  it("formate en centimes uniquement au blur", () => {
    const onCommit = jest.fn();
    const { result } = renderHook(() =>
      useEuroMonetaryTextInput({ amountCents: 0, allowEmpty: true })
    );

    act(() => {
      result.current.handleChange("50");
    });

    act(() => {
      result.current.handleBlur(onCommit);
    });

    expect(onCommit).toHaveBeenCalledWith(5_000);
    expect(result.current.text).toBe("50,00");
  });

  it("n'écrase pas la saisie en cours quand amountCents change côté parent", () => {
    const { result, rerender } = renderHook(
      ({ amountCents }: { amountCents: number }) =>
        useEuroMonetaryTextInput({ amountCents, allowEmpty: true }),
      { initialProps: { amountCents: 0 } }
    );

    act(() => {
      result.current.handleFocus({
        target: { select: jest.fn() },
      } as unknown as FocusEvent<HTMLInputElement>);
      result.current.handleChange("5");
    });

    rerender({ amountCents: 500 });

    expect(result.current.text).toBe("5");
  });
});
