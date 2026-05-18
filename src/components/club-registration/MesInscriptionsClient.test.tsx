/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import { MesInscriptionsClient } from "./MesInscriptionsClient";

describe("MesInscriptionsClient", () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it("affiche un état vide quand aucun dossier n'est retourné", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ registrations: [] }),
    });
    render(<MesInscriptionsClient />);
    expect(
      await screen.findByText(/vous n.?avez pas encore de dossier/i)
    ).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/club/registrations",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("rend les dossiers retournés par l'API", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        registrations: [
          {
            id: "reg_1",
            firstName: "Léa",
            lastName: "Martin",
            adherentRole: "minor_dependent",
            mainSectionId: "voisins",
            status: "submitted",
            submittedAt: "2026-05-10T12:00:00.000Z",
          },
        ],
      }),
    });
    render(<MesInscriptionsClient />);
    expect(await screen.findByText(/léa martin/i)).toBeInTheDocument();
    expect(screen.getByText(/voisins-le-bretonneux/i)).toBeInTheDocument();
    expect(screen.getByText(/en cours d.?examen/i)).toBeInTheDocument();
  });

  it("affiche un message d'erreur si l'API retourne un échec", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Authentification requise" }),
    });
    render(<MesInscriptionsClient />);
    await waitFor(() =>
      expect(screen.getByText(/authentification requise/i)).toBeInTheDocument()
    );
  });
});
