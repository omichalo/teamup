/**
 * @jest-environment jsdom
 */

import { render, screen, act } from "@testing-library/react";
import { ClubRegistrationWizard } from "./ClubRegistrationWizard";

/* On mocke les hooks de storage : ils dépendent de localStorage et d'effets
   asynchrones (debounce de save) qui ne nous intéressent pas pour tester le
   focus management — on veut juste pouvoir manipuler activeStep via clic. */
jest.mock("./useRegistrationDraftStorage", () => ({
  useRegistrationDraftStorage: () => ({
    load: () => null,
    save: jest.fn(),
    clear: jest.fn(),
    status: "idle" as const,
    isDisabled: false,
    lastSavedAt: null,
    disable: jest.fn(),
    enable: jest.fn(),
  }),
}));

/* On évite d'instancier Firebase à l'import en stubbant l'AuthDialog. */
jest.mock("@/components/auth/AuthDialog", () => ({
  AuthDialog: () => null,
}));

describe("ClubRegistrationWizard — focus management", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  function flushRaf() {
    act(() => {
      jest.advanceTimersByTime(50);
    });
  }

  it("place le focus sur le titre invisible de l'étape au mount", () => {
    jest.useFakeTimers();
    /* requestAnimationFrame est mocké pour s'exécuter de manière synchrone
       lorsque l'on avance les timers. */
    const rafSpy = jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        return setTimeout(() => cb(0), 0) as unknown as number;
      });

    render(<ClubRegistrationWizard accountEmail={null} />);
    flushRaf();
    /* Le titre invisible <h2> doit exister pour l'étape 1. */
    const heading = screen.getByRole("heading", {
      level: 2,
      name: /étape 1 sur 5 .* identité/i,
    });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName.toLowerCase()).toBe("h2");

    rafSpy.mockRestore();
    jest.useRealTimers();
  });
});
