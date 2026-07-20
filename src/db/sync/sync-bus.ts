type Listener = (table: string) => void;
const localListeners = new Set<Listener>();

export function notifyLocalChange(table: string) {
  localListeners.forEach((l) => l(table));
}

export function onLocalChange(listener: Listener): () => void {
  localListeners.add(listener);
  return () => localListeners.delete(listener);
}