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

  const useStore = (<U = T>(selector: (value: T) => U = (value) => value as unknown as U) => {
    return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
  }) as ZustandStore<T>;

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore;
}

