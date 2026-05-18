/**
 * @jest-environment jsdom
 */

import { render, screen, act } from "@testing-library/react";
import { ClubRegistrationWizard } from "./ClubRegistrationWizard";

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

  it("place le focus sur le titre invisible de la 1ʳᵉ étape (« Pour qui ? »)", () => {
    jest.useFakeTimers();
    const rafSpy = jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        return setTimeout(() => cb(0), 0) as unknown as number;
      });

    render(<ClubRegistrationWizard accountEmail={null} />);
    flushRaf();
    /* Pour un majeur (date par défaut vide → adherentRole "self" sans
       représentants requis), la séquence est 6 étapes (audience → adherent →
       practice → admin → engagements → recap). Le titre invisible <h2> doit
       annoncer « Étape 1 sur 6 » avec le libellé « Pour qui ? ». */
    const heading = screen.getByRole("heading", {
      level: 2,
      name: /étape 1 sur 6 .* pour qui/i,
    });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName.toLowerCase()).toBe("h2");

    rafSpy.mockRestore();
    jest.useRealTimers();
  });
});
