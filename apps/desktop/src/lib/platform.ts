/** Coarse OS platform detection without relying on a Tauri plugin (works in-browser too). */
export function detectPlatform(): "windows" | "macos" | "linux" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "windows";
  if (ua.includes("Mac OS")) return "macos";
  if (ua.includes("Linux")) return "linux";
  return "unknown";
}

/** Human-readable label for the settings page. */
export function detectPlatformLabel(): string {
  const platform = detectPlatform();
  switch (platform) {
    case "windows":
      return "Windows";
    case "macos":
      return "macOS";
    case "linux":
      return "Linux";
    default:
      return typeof navigator === "undefined" ? "unknown" : navigator.platform || "unknown";
  }
}
