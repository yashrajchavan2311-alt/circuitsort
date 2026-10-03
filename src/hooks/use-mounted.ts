'use client';

import { useSyncExternalStore } from 'react';

// Mount-aware hook that avoids the `setState-in-effect` lint rule by using
// useSyncExternalStore with a module-level flag. This prevents hydration
// mismatches for components that depend on client-only state (e.g. theme).

let isMounted = false;
const mountListeners = new Set<() => void>();

// On the client, flip the flag to true after the initial hydration completes.
// queueMicrotask ensures this runs after the synchronous render/hydration pass.
if (typeof window !== 'undefined') {
  queueMicrotask(() => {
    if (isMounted) return;
    isMounted = true;
    mountListeners.forEach((l) => l());
  });
}

function subscribeMount(listener: () => void) {
  mountListeners.add(listener);
  return () => {
    mountListeners.delete(listener);
  };
}

function getMountedSnapshot(): boolean {
  return isMounted;
}

function getServerMountedSnapshot(): boolean {
  return false;
}

export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeMount,
    getMountedSnapshot,
    getServerMountedSnapshot
  );
}
