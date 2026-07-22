/**
 * Wraps `@tauri-apps/plugin-updater` behind dynamic imports so the module
 * loads fine even when there is no Tauri runtime around it (plain browser
 * dev server, unit tests, `tsc --noEmit` in CI without a Rust toolchain).
 */

export interface UpdateInfo {
  available: boolean;
  currentVersion?: string;
  version?: string;
  date?: string;
  body?: string;
}

export type UpdateProgress =
  | { event: "started"; contentLength?: number }
  | { event: "progress"; chunkLength: number }
  | { event: "finished" };

/** Checks the configured update endpoint. Resolves to `{ available: false }` if not running in Tauri. */
export async function checkForUpdates(): Promise<UpdateInfo> {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return { available: false };
    return {
      available: true,
      currentVersion: update.currentVersion,
      version: update.version,
      date: update.date,
      body: update.body,
    };
  } catch (error) {
    console.warn("Preverjanje posodobitev ni na voljo (ni v namizkem okolju).", error);
    return { available: false };
  }
}

/** Downloads and installs the pending update, then relaunches the app. */
export async function installUpdateAndRelaunch(onProgress?: (progress: UpdateProgress) => void): Promise<void> {
  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) return;

  await update.downloadAndInstall((event) => {
    if (!onProgress) return;
    switch (event.event) {
      case "Started":
        onProgress({ event: "started", contentLength: event.data.contentLength });
        break;
      case "Progress":
        onProgress({ event: "progress", chunkLength: event.data.chunkLength });
        break;
      case "Finished":
        onProgress({ event: "finished" });
        break;
    }
  });

  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}
