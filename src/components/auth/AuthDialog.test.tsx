/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
}));

jest.mock("@/lib/firebase.client", () => ({
  clientAuth: { currentUser: null },
}));

import { AuthDialog } from "./AuthDialog";

describe("AuthDialog", () => {
  it("ne rend rien quand open=false", () => {
    render(<AuthDialog open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("rend en mode login par défaut", () => {
    render(<AuthDialog open onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: /se connecter/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^se connecter$/i })
    ).toBeInTheDocument();
  });

  it("respecte defaultMode='signup'", () => {
    render(<AuthDialog open onClose={() => {}} defaultMode="signup" />);
    expect(
      screen.getByRole("dialog", { name: /créer un compte/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /créer mon compte/i })
    ).toBeInTheDocument();
  });

  it("bascule en interne entre login et signup au clic sur le lien de mode", async () => {
    const user = userEvent.setup();
    render(<AuthDialog open onClose={() => {}} />);

    expect(
      screen.getByRole("dialog", { name: /se connecter/i })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /pas de compte \? créer un compte/i })
    );
    expect(
      screen.getByRole("dialog", { name: /créer un compte/i })
    ).toBeInTheDocument();
  });

  it("appelle onClose au clic sur le bouton de fermeture", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<AuthDialog open onClose={onClose} />);

    await user.click(
      screen.getByRole("button", { name: /fermer la fenêtre d'authentification/i })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("affiche le headerSlot", () => {
    render(
      <AuthDialog
        open
        onClose={() => {}}
        headerSlot={<span>BANNER</span>}
      />
    );
    expect(screen.getByText("BANNER")).toBeInTheDocument();
  });
});
