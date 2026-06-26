/**
 * @jest-environment jsdom
 */

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signInMock = jest.fn();
const createUserMock = jest.fn();

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => signInMock(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => createUserMock(...args),
}));

jest.mock("@/lib/firebase.client", () => ({
  clientAuth: { currentUser: null },
}));

import { clientAuth } from "@/lib/firebase.client";

const fakeAuth = clientAuth as unknown as {
  currentUser: { emailVerified: boolean; reload: jest.Mock } | null;
};

import { AuthForm } from "./AuthForm";

describe("AuthForm", () => {
  beforeEach(() => {
    signInMock.mockReset();
    createUserMock.mockReset();
    fakeAuth.currentUser = null;
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  describe("mode login", () => {
    it("rend les champs email et password et le CTA Se connecter", () => {
      render(<AuthForm mode="login" />);
      expect(
        screen.getByLabelText(/email/i, { selector: "input" })
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/mot de passe/i, { selector: "input" })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /se connecter/i })).toBeInTheDocument();
    });

    it("appelle onModeChange si fourni au clic sur 'Pas de compte ? Créer un compte'", async () => {
      const onModeChange = jest.fn();
      const user = userEvent.setup();
      render(<AuthForm mode="login" onModeChange={onModeChange} />);

      const link = screen.getByRole("button", {
        name: /pas de compte \? créer un compte/i,
      });
      await user.click(link);
      expect(onModeChange).toHaveBeenCalledWith("signup");
    });

    it("affiche un message d'erreur en cas d'email invalide (validation Zod)", async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="login" />);
      await user.type(
        screen.getByLabelText(/email/i, { selector: "input" }),
        "not-an-email"
      );
      await user.type(
        screen.getByLabelText(/mot de passe/i, { selector: "input" }),
        "anything"
      );
      await user.click(screen.getByRole("button", { name: /se connecter/i }));
      expect(await screen.findByText(/email invalide/i)).toBeInTheDocument();
      expect(signInMock).not.toHaveBeenCalled();
    });
  });

  describe("mode signup", () => {
    it("rend email + password + confirm + CTA Créer mon compte", () => {
      render(<AuthForm mode="signup" />);
      expect(
        screen.getByRole("textbox", { name: /email/i })
      ).toBeInTheDocument();
      const passwordInputs = screen.getAllByLabelText(/mot de passe/i, {
        selector: "input",
      });
      expect(
        passwordInputs.some((i) => i.getAttribute("name") === "password")
      ).toBe(true);
      expect(
        passwordInputs.some((i) => i.getAttribute("name") === "confirm")
      ).toBe(true);
      expect(
        screen.getByRole("button", { name: /créer mon compte/i })
      ).toBeInTheDocument();
    });

    it("affiche un échec explicite si l'envoi de vérification échoue après inscription", async () => {
      createUserMock.mockResolvedValueOnce({ user: { uid: "u1" } });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: "Trop de requêtes",
          message: "Veuillez patienter avant de renvoyer un email.",
        }),
      });
      const user = userEvent.setup();
      render(<AuthForm mode="signup" />);

      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "ok@example.com"
      );
      const passwordInputs = screen.getAllByLabelText(/mot de passe/i, {
        selector: "input",
      });
      const main = passwordInputs.find((i) => i.getAttribute("name") === "password")!;
      const confirm = passwordInputs.find((i) => i.getAttribute("name") === "confirm")!;
      await user.type(main, "Aaaaaaaaaa1!");
      await user.type(confirm, "Aaaaaaaaaa1!");
      await act(async () => {
        await user.click(screen.getByRole("button", { name: /créer mon compte/i }));
      });

      expect(
        await screen.findByText(/l'envoi de l'email de vérification a échoué/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/veuillez patienter avant de renvoyer un email/i)
      ).toBeInTheDocument();
    });

    it("affiche un message d'erreur si les mots de passe ne correspondent pas", async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="signup" />);
      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "ok@example.com"
      );
      const passwordInputs = screen.getAllByLabelText(/mot de passe/i, {
        selector: "input",
      });
      const main = passwordInputs.find((i) => i.getAttribute("name") === "password")!;
      const confirm = passwordInputs.find((i) => i.getAttribute("name") === "confirm")!;
      await user.type(main, "Aaaaaaaaaa1!");
      await user.type(confirm, "Different1!aa");
      expect(
        await screen.findByText(/les mots de passe ne correspondent pas/i)
      ).toBeInTheDocument();
    });
  });

  describe("mode forgot-password", () => {
    it("rend uniquement le champ email et le CTA Envoyer le lien", () => {
      render(<AuthForm mode="forgot-password" />);
      expect(
        screen.getByLabelText(/email/i, { selector: "input" })
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText(/mot de passe/i, { selector: "input" })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /envoyer le lien/i })
      ).toBeInTheDocument();
    });

    it("affiche un succès après une réponse 200", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });
      const user = userEvent.setup();
      render(<AuthForm mode="forgot-password" />);

      await user.type(
        screen.getByLabelText(/email/i, { selector: "input" }),
        "user@example.com"
      );
      await act(async () => {
        await user.click(screen.getByRole("button", { name: /envoyer le lien/i }));
      });
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/send-password-reset",
        expect.objectContaining({ method: "POST" })
      );
      expect(
        await screen.findByText(/email de réinitialisation envoyé/i)
      ).toBeInTheDocument();
    });
  });

  describe("headerSlot", () => {
    it("rend le contenu fourni en headerSlot dans chaque mode", () => {
      const { rerender } = render(
        <AuthForm mode="login" headerSlot={<span>HEADER-LOGIN</span>} />
      );
      expect(screen.getByText("HEADER-LOGIN")).toBeInTheDocument();

      rerender(<AuthForm mode="signup" headerSlot={<span>HEADER-SIGNUP</span>} />);
      expect(screen.getByText("HEADER-SIGNUP")).toBeInTheDocument();

      rerender(
        <AuthForm
          mode="forgot-password"
          headerSlot={<span>HEADER-FORGOT</span>}
        />
      );
      expect(screen.getByText("HEADER-FORGOT")).toBeInTheDocument();
    });
  });
});
