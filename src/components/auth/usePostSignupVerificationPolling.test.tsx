/**
 * @jest-environment jsdom
 */

import { act, renderHook } from "@testing-library/react";

const reload = jest.fn();
const fakeUser = { emailVerified: false, reload };

jest.mock("@/lib/firebase.client", () => ({
  clientAuth: {
    get currentUser() {
      return fakeUser;
    },
  },
}));

import { usePostSignupVerificationPolling } from "./usePostSignupVerificationPolling";

describe("usePostSignupVerificationPolling", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    reload.mockReset();
    fakeUser.emailVerified = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("ne polle pas quand enabled=false", () => {
    const onVerified = jest.fn();
    renderHook(() =>
      usePostSignupVerificationPolling({
        enabled: false,
        onVerified,
        intervalMs: 1000,
      })
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(reload).not.toHaveBeenCalled();
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("polle, détecte la vérification et appelle onVerified", async () => {
    reload.mockImplementation(async () => {
      fakeUser.emailVerified = true;
    });
    const onVerified = jest.fn();
    renderHook(() =>
      usePostSignupVerificationPolling({
        enabled: true,
        onVerified,
        intervalMs: 1000,
      })
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(reload).toHaveBeenCalled();
    expect(onVerified).toHaveBeenCalledTimes(1);
  });

  it("expose le statut timeout après le délai configuré", () => {
    reload.mockImplementation(async () => {});
    const onVerified = jest.fn();
    const { result } = renderHook(() =>
      usePostSignupVerificationPolling({
        enabled: true,
        onVerified,
        intervalMs: 1000,
        timeoutMs: 3000,
      })
    );

    expect(result.current.status).toBe("polling");

    act(() => {
      jest.advanceTimersByTime(3500);
    });

    expect(result.current.status).toBe("timeout");
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("nettoie l'intervalle à l'unmount", () => {
    reload.mockImplementation(async () => {});
    const onVerified = jest.fn();
    const { unmount } = renderHook(() =>
      usePostSignupVerificationPolling({
        enabled: true,
        onVerified,
        intervalMs: 1000,
      })
    );

    unmount();
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(reload).not.toHaveBeenCalled();
  });
});
