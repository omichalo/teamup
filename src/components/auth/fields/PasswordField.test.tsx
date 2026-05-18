import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordField } from "./PasswordField";

describe("PasswordField", () => {
  it("rend un champ password masqué par défaut", () => {
    render(<PasswordField name="password" />);
    const input = screen.getByLabelText(/mot de passe/i, { selector: "input" });
    expect(input).toHaveAttribute("type", "password");
  });

  it("bascule entre password et text au clic sur l'icône", async () => {
    const user = userEvent.setup();
    render(<PasswordField name="password" />);
    const input = screen.getByLabelText(/mot de passe/i, { selector: "input" });
    expect(input).toHaveAttribute("type", "password");

    const toggle = screen.getByRole("button", {
      name: /afficher ou masquer le mot de passe/i,
    });
    await user.click(toggle);
    expect(input).toHaveAttribute("type", "text");

    await user.click(toggle);
    expect(input).toHaveAttribute("type", "password");
  });

  it("transmet le label personnalisé", () => {
    render(<PasswordField name="confirm" label="Confirmer le mot de passe" />);
    expect(screen.getByLabelText(/confirmer le mot de passe/i)).toBeInTheDocument();
  });
});
