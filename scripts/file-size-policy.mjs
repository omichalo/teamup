/**
 * Politique universelle de taille des fichiers sous src/.
 * Même règles pour tout le dépôt (pas de comparaison git vs main).
 *
 * @see docs/QUALITY_GATES.md
 * @see .cursor/rules/21-react-component-size.mdc
 */

/** @typedef {{ name: string; max: number; test: (relPath: string) => boolean }} FileSizePolicy */

/** @type {FileSizePolicy[]} */
export const FILE_SIZE_POLICIES = [
  {
    name: "page",
    max: 250,
    test: (p) => p.endsWith("/page.tsx"),
  },
  {
    name: "component",
    max: 400,
    test: (p) => p.includes("/components/") && p.endsWith(".tsx"),
  },
  {
    name: "app-container",
    max: 450,
    test: (p) => p.includes("/_containers/") && p.endsWith(".tsx"),
  },
  {
    name: "test",
    max: 650,
    test: (p) => /\.test\.(ts|tsx)$/.test(p),
  },
  {
    name: "lib",
    max: 500,
    test: (p) => p.includes("/lib/") && !/\.test\.(ts|tsx)$/.test(p),
  },
  {
    name: "default",
    max: 500,
    test: () => true,
  },
];

/**
 * @param {string} relPath chemin relatif depuis la racine du repo (ex. src/...)
 * @returns {{ policy: FileSizePolicy; max: number }}
 */
export function resolvePolicy(relPath) {
  const policy = FILE_SIZE_POLICIES.find((p) => p.test(relPath));
  return { policy: policy ?? FILE_SIZE_POLICIES.at(-1), max: policy?.max ?? 500 };
}
