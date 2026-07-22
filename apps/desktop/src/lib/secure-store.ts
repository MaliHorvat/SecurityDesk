/**
 * Secure key/value storage for the desktop shell.
 *
 * In production (packaged app) this proxies to the Rust `secure_set` /
 * `secure_get` commands (see src-tauri/src/commands/mod.rs), which persist
 * values using the OS keychain/credential store where available.
 *
 * When running outside of Tauri (plain browser dev, tests, CI typecheck) —
 * or if the Tauri `invoke` bridge simply isn't present — every call falls
 * back to an in-memory Map so the rest of the app keeps working.
 */

export interface SecureStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

type InvokeFn = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

let invokePromise: Promise<InvokeFn | null> | null = null;

/** Lazily (and safely) resolve the Tauri `invoke` bridge, once. */
function getInvoke(): Promise<InvokeFn | null> {
  if (!invokePromise) {
    invokePromise = import("@tauri-apps/api/core")
      .then((mod) => mod.invoke as InvokeFn)
      .catch(() => null);
  }
  return invokePromise;
}

const memoryStore = new Map<string, string>();

export const secureStore: SecureStore = {
  async get(key) {
    const invoke = await getInvoke();
    if (invoke) {
      try {
        const value = await invoke<string | null>("secure_get", { key });
        return value ?? null;
      } catch (error) {
        console.warn(`secure-store: secure_get("${key}") failed, using memory fallback`, error);
      }
    }
    return memoryStore.get(key) ?? null;
  },

  async set(key, value) {
    const invoke = await getInvoke();
    if (invoke) {
      try {
        await invoke("secure_set", { key, value });
        return;
      } catch (error) {
        console.warn(`secure-store: secure_set("${key}") failed, using memory fallback`, error);
      }
    }
    memoryStore.set(key, value);
  },

  async delete(key) {
    const invoke = await getInvoke();
    if (invoke) {
      try {
        // No dedicated delete command on the Rust side yet — clearing the
        // value is functionally equivalent for our use cases (auth tokens).
        await invoke("secure_set", { key, value: "" });
        return;
      } catch (error) {
        console.warn(`secure-store: clearing "${key}" via secure_set failed, using memory fallback`, error);
      }
    }
    memoryStore.delete(key);
  },
};

let installationIdPromise: Promise<string> | null = null;

/** Stable per-installation identifier, backed by the Rust `get_installation_id` command. */
export async function getInstallationId(): Promise<string> {
  if (!installationIdPromise) {
    installationIdPromise = (async () => {
      const invoke = await getInvoke();
      if (invoke) {
        try {
          return await invoke<string>("get_installation_id");
        } catch (error) {
          console.warn("secure-store: get_installation_id failed, generating a local id", error);
        }
      }
      const cached = memoryStore.get("__installation_id__");
      if (cached) return cached;
      const generated = crypto.randomUUID();
      memoryStore.set("__installation_id__", generated);
      return generated;
    })();
  }
  return installationIdPromise;
}
