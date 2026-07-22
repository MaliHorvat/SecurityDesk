#!/usr/bin/env node
/**
 * Bumps the SecurityDesk desktop app version in every place it needs to be
 * consistent:
 *   - apps/desktop/package.json            ("version")
 *   - apps/desktop/src-tauri/tauri.conf.json ("version")
 *   - apps/desktop/src-tauri/Cargo.toml     ([package] version)
 *
 * Usage:
 *   node scripts/set-desktop-version.mjs 1.2.0
 *   pnpm desktop:version 1.2.0
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const desktopDir = resolve(root, "apps/desktop");

const PACKAGE_JSON = resolve(desktopDir, "package.json");
const TAURI_CONF = resolve(desktopDir, "src-tauri/tauri.conf.json");
const CARGO_TOML = resolve(desktopDir, "src-tauri/Cargo.toml");

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function setPackageJsonVersion(path, version) {
  const json = readJson(path);
  const previous = json.version;
  json.version = version;
  writeJson(path, json);
  return previous;
}

function setTauriConfVersion(path, version) {
  const json = readJson(path);
  const previous = json.version;
  json.version = version;
  writeJson(path, json);
  return previous;
}

function setCargoTomlVersion(path, version) {
  const content = readFileSync(path, "utf8");
  const lines = content.split(/\r?\n/);
  let inPackageSection = false;
  let previous = null;
  let replaced = false;

  const nextLines = lines.map((line) => {
    const sectionMatch = line.match(/^\[(.+)\]\s*$/);
    if (sectionMatch) {
      inPackageSection = sectionMatch[1] === "package";
      return line;
    }
    if (inPackageSection && !replaced) {
      const versionMatch = line.match(/^version\s*=\s*"(.*)"\s*$/);
      if (versionMatch) {
        previous = versionMatch[1];
        replaced = true;
        return `version = "${version}"`;
      }
    }
    return line;
  });

  if (!replaced) {
    throw new Error(`Ni najdenega "version" v razdelku [package] datoteke ${path}`);
  }

  writeFileSync(path, nextLines.join("\n"), "utf8");
  return previous;
}

function main() {
  const version = process.argv[2]?.trim();

  if (!version) {
    console.error("Uporaba: node scripts/set-desktop-version.mjs <version>");
    console.error("Primer:  node scripts/set-desktop-version.mjs 1.2.0");
    process.exit(1);
  }

  if (!SEMVER_RE.test(version)) {
    console.error(`Neveljavna različica "${version}" — pričakovan format semver, npr. 1.2.0`);
    process.exit(1);
  }

  for (const path of [PACKAGE_JSON, TAURI_CONF, CARGO_TOML]) {
    if (!existsSync(path)) {
      console.error(`Datoteka ne obstaja: ${path}`);
      process.exit(1);
    }
  }

  const fromPackageJson = setPackageJsonVersion(PACKAGE_JSON, version);
  const fromTauriConf = setTauriConfVersion(TAURI_CONF, version);
  const fromCargoToml = setCargoTomlVersion(CARGO_TOML, version);

  console.log(`Različica namizne aplikacije SecurityDesk posodobljena na ${version}:`);
  console.log(`  apps/desktop/package.json:              ${fromPackageJson} -> ${version}`);
  console.log(`  apps/desktop/src-tauri/tauri.conf.json:  ${fromTauriConf} -> ${version}`);
  console.log(`  apps/desktop/src-tauri/Cargo.toml:       ${fromCargoToml} -> ${version}`);
}

main();
