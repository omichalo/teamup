// Utilitaires de détection d'environnement
export const isServer = typeof window === "undefined";
export const isClient = typeof window !== "undefined";

// Fonction pour vérifier si on est dans un environnement Node.js
export const isNode =
  typeof process !== "undefined" && process.versions && process.versions.node;

// Fonction pour vérifier si on est dans un environnement Next.js
export const isNextJS =
  typeof process !== "undefined" && process.env.NEXT_RUNTIME;

// Fonction pour vérifier si on est dans un environnement de test
export const isTest =
  typeof process !== "undefined" && process.env.NODE_ENV === "test";

// Fonction pour vérifier si on est dans un environnement de build
export const isBuild =
  typeof process !== "undefined" && process.env.NODE_ENV === "production";

// Fonction pour vérifier si on est dans un environnement de développement
export const isDev =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

// Fonction pour vérifier si on peut utiliser les hooks React
// Avec Next.js 15 et Turbopack, on doit être plus prudent
export const canUseHooks = isClient && !isTest && typeof React !== "undefined";

// Fonction pour vérifier si on peut utiliser localStorage
export const canUseLocalStorage =
  isClient && typeof localStorage !== "undefined";

// Fonction pour vérifier si on peut utiliser sessionStorage
export const canUseSessionStorage =
  isClient && typeof sessionStorage !== "undefined";
