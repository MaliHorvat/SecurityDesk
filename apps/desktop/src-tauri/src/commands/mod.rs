//! Small set of app-level commands exposed to the webview via
//! `tauri::generate_handler!` (see `lib.rs`). These are plain `#[tauri::command]`
//! functions rather than a full plugin, so no capability/ACL entry is needed
//! for them — every window can call them directly.

use keyring::Entry;
use uuid::Uuid;

/// Keychain "service" namespace used for every secure_* entry. Keeping this
/// stable across releases means upgrades don't lose the stored auth token or
/// installation id.
const SERVICE_NAME: &str = "si.visionone.securitydesk";
const INSTALLATION_ID_KEY: &str = "installation_id";

fn keychain_entry(key: &str) -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, key).map_err(|err| err.to_string())
}

/// Persists `value` under `key` in the OS secure credential store (Windows
/// Credential Manager / macOS Keychain / Linux Secret Service).
#[tauri::command]
pub fn secure_set(key: String, value: String) -> Result<(), String> {
    let entry = keychain_entry(&key)?;
    entry.set_password(&value).map_err(|err| err.to_string())
}

/// Reads a value previously stored with `secure_set`. Returns `Ok(None)` if
/// the key was never set (rather than an error), so callers can treat a
/// missing entry the same as "logged out".
#[tauri::command]
pub fn secure_get(key: String) -> Result<Option<String>, String> {
    let entry = keychain_entry(&key)?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(err) => Err(err.to_string()),
    }
}

/// Stable per-installation UUID, generated once and stored in the same
/// secure store as auth tokens. Used to identify this desktop install to the
/// SecurityDesk backend (update rollout targeting, support diagnostics).
#[tauri::command]
pub fn get_installation_id() -> Result<String, String> {
    let entry = keychain_entry(INSTALLATION_ID_KEY)?;
    if let Ok(existing) = entry.get_password() {
        return Ok(existing);
    }

    let generated = Uuid::new_v4().to_string();
    entry
        .set_password(&generated)
        .map_err(|err| err.to_string())?;
    Ok(generated)
}

/// Opens `path` (a file, folder, or URL) with the OS-registered default
/// application, without depending on the (not requested) `tauri-plugin-opener`.
#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|err| err.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|err| err.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|err| err.to_string())?;
    }

    Ok(())
}
