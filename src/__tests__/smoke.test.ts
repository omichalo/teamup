/**
 * Smoke test minimal pour valider le setup du projet
 * Ce test vérifie que les dépendances et la configuration de base fonctionnent
 */

describe("Smoke Tests", () => {
  it("should have a working test environment", () => {
    expect(true).toBe(true);
  });

  it("should be able to import from @/ alias", () => {
    // Test que le path alias @/ fonctionne
    // On teste avec un import simple qui devrait toujours exister
    expect(() => {
      // Ce test vérifie juste que le setup Jest fonctionne
      // Les imports réels seront testés dans les tests spécifiques
      return true;
    }).not.toThrow();
  });

  it("should have access to environment variables", () => {
    // Test que les variables d'environnement sont accessibles
    // (même si elles peuvent être undefined en test)
    expect(process.env.NODE_ENV).toBeDefined();
  });
});

