import { render, screen } from "@testing-library/react";
import { EmailField } from "./EmailField";

describe("EmailField", () => {
  it("rend un champ email avec le label par défaut et autocomplete email", () => {
    render(<EmailField name="email" />);
    const input = screen.getByLabelText(/email/i, { selector: "input" });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("autocomplete", "email");
  });

  it("accepte un label personnalisé", () => {
    render(<EmailField name="email" label="Adresse e-mail" />);
    expect(screen.getByLabelText(/adresse e-mail/i)).toBeInTheDocument();
  });

  it("transmet la value contrôlée", () => {
    render(<EmailField name="email" value="hello@example.com" onChange={() => {}} />);
    const input = screen.getByLabelText(/email/i, { selector: "input" }) as HTMLInputElement;
    expect(input.value).toBe("hello@example.com");
  });
});
