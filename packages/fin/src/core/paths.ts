import os from "os"
import path from "path"

const APP = "fin"

// $HOME first, as Node does; Bun's os.homedir() ignores it, which matters for tests and sandboxes.
export function homeDir() {
  return process.env.HOME?.trim() || process.env.USERPROFILE?.trim() || os.homedir()
}

function xdg(variable: string, fallback: string) {
  const value = process.env[variable]?.trim()
  return value && path.isAbsolute(value) ? value : path.join(homeDir(), fallback)
}

export const Paths = {
  get config() {
    return path.join(xdg("XDG_CONFIG_HOME", ".config"), APP)
  },
  get cache() {
    return process.env.FINANCE_CACHE_DIR?.trim() || path.join(xdg("XDG_CACHE_HOME", ".cache"), APP)
  },
  get credentials() {
    return process.env.FINANCE_CREDENTIALS_FILE?.trim() || path.join(this.config, "credentials.json")
  },
  // Read-only fallbacks: the pre-rename config dir, then the retired plugin's auth store.
  get legacyCredentials() {
    return [
      path.join(xdg("XDG_CONFIG_HOME", ".config"), "opencode-finance", "credentials.json"),
      path.join(xdg("XDG_DATA_HOME", ".local/share"), "opencode", "auth.json"),
    ]
  },
}
