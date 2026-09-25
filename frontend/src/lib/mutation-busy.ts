/** Tracks in-flight mutating API requests so the UI can show a global submit loader. */

type Listener = () => void;

let busyCount = 0;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function beginMutationBusy(): void {
  busyCount += 1;
  notify();
}

export function endMutationBusy(): void {
  busyCount = Math.max(0, busyCount - 1);
  notify();
}

export function getMutationBusyCount(): number {
  return busyCount;
}

export function isMutationBusy(): boolean {
  return busyCount > 0;
}

export function subscribeMutationBusy(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
