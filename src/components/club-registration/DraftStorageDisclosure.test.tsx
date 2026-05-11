/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { DraftStorageDisclosure } from "./DraftStorageDisclosure";

function setup() {
  const onClear = jest.fn();
  const onDisable = jest.fn();
  const onEnable = jest.fn();
  render(
    <DraftStorageDisclosure
      status="saved"
      isDisabled={false}
      lastSavedAt={new Date()}
      onDisable={onDisable}
      onEnable={onEnable}
      onClear={onClear}
    />
  );
  return { onClear, onDisable, onEnable };
}

describe("DraftStorageDisclosure — confirmation de suppression", () => {
  it("n'appelle pas onClear immédiatement quand on clique sur « Effacer mon brouillon »", () => {
    const { onClear } = setup();
    fireEvent.click(
      screen.getByRole("button", { name: /effacer mon brouillon/i })
    );
    expect(onClear).not.toHaveBeenCalled();
  });

  it("ouvre un Dialog de confirmation explicite", () => {
    setup();
    fireEvent.click(
      screen.getByRole("button", { name: /effacer mon brouillon/i })
    );
    expect(
      screen.getByRole("dialog", { name: /effacer le brouillon/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/supprimées de ce navigateur/i, { exact: false })
    ).toBeInTheDocument();
  });

  it("appelle onClear seulement si on confirme dans le Dialog", () => {
    const { onClear } = setup();
    fireEvent.click(
      screen.getByRole("button", { name: /effacer mon brouillon/i })
    );
    /* Le bouton de confirmation est le second bouton « Effacer le brouillon »
       à l'intérieur du Dialog (titre id-é « confirm-clear-title »). */
    const dialog = screen.getByRole("dialog");
    const confirmBtn = Array.from(
      dialog.querySelectorAll("button")
    ).find((b) => /effacer le brouillon/i.test(b.textContent ?? ""));
    expect(confirmBtn).toBeDefined();
    fireEvent.click(confirmBtn!);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("annuler ferme le Dialog sans appeler onClear", () => {
    const { onClear } = setup();
    fireEvent.click(
      screen.getByRole("button", { name: /effacer mon brouillon/i })
    );
    fireEvent.click(screen.getByRole("button", { name: /annuler/i }));
    expect(onClear).not.toHaveBeenCalled();
  });
});
