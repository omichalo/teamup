import { useSyncExternalStore } from "react";

type StateCreator<T> = (
  setState: (
    partial: Partial<T> | ((state: T) => Partial<T>),
    replace?: boolean
  ) => void,
  getState: () => T,
  api: StoreApi<T>
) => T;

type Listener = () => void;

export interface StoreApi<T> {
  getState: () => T;
  setState: (
    partial: Partial<T> | ((state: T) => Partial<T>),
    replace?: boolean
  ) => void;
  subscribe: (listener: Listener) => () => void;
}

export type ZustandStore<T> = (<U = T>(selector?: (state: T) => U) => U) &
  StoreApi<T>;

export function create<T>(creator: StateCreator<T>): ZustandStore<T> {
  const listeners = new Set<Listener>();
  const getState = () => state;
  const setState: StoreApi<T>["setState"] = (partial, replace) => {
    const next = typeof partial === "function" ? partial(state) : partial;
    state = replace ? (next as T) : { ...state, ...next };
    listeners.forEach((listener) => listener());
  };
  const subscribe: StoreApi<T>["subscribe"] = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  let state = creator(setState, getState, { getState, setState, subscribe });
  
  // Capture le state initial pour le SSR (une seule fois)
  const serverStateSnapshot = state;
  
  // Cache global pour les fonctions getServerSnapshot stables par selector
  const serverSnapshotFunctions = new Map<string, () => unknown>();
  
  // Cache global pour les valeurs de getSnapshot avec comparaison shallow
  // Structure: Map<selectorKey, { lastValue: unknown, lastState: T }>
  const snapshotCache = new Map<string, { lastValue: unknown; lastState: T }>();
  
  // Fonction de comparaison shallow pour les objets
  function shallowEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== "object" || typeof b !== "object") return false;
    
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!(key in (b as Record<string, unknown>))) return false;
      if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) {
        return false;
      }
    }
    
    return true;
  }

  const useStore = (<U = T>(selector: (value: T) => U = (value) => value as unknown as U) => {
    // Créer une clé stable pour le selector en utilisant son code source
    const selectorKey = selector.toString();
    
    // getSnapshot doit retourner une valeur stable (mise en cache)
    // pour éviter les boucles infinies
    const getSnapshot = (): U => {
      const currentValue = selector(state);
      const cached = snapshotCache.get(selectorKey);
      
      // Si le state n'a pas changé et la valeur est identique (shallow), retourner la valeur en cache
      if (cached && cached.lastState === state && shallowEqual(cached.lastValue, currentValue)) {
        return cached.lastValue as U;
      }
      
      // Mettre à jour le cache
      snapshotCache.set(selectorKey, { lastValue: currentValue, lastState: state });
      return currentValue;
    };
    
    // getServerSnapshot doit être une fonction stable (mise en cache)
    // pour éviter les boucles infinies - React exige que la même fonction soit réutilisée
    let getServerSnapshot = serverSnapshotFunctions.get(selectorKey) as (() => U) | undefined;
    
    if (!getServerSnapshot) {
      // Première fois : créer une fonction stable qui retourne toujours la valeur initiale
      const initialValue = selector(serverStateSnapshot);
      getServerSnapshot = () => initialValue;
      serverSnapshotFunctions.set(selectorKey, getServerSnapshot);
    }
    
    return useSyncExternalStore(
      subscribe,
      getSnapshot,
      getServerSnapshot
    );
  }) as ZustandStore<T>;

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore;
}

