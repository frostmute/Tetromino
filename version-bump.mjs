import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// Update manifest.json
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// Update versions.json
let versions = {};
try {
	versions = JSON.parse(readFileSync("versions.json", "utf8"));
} catch {
	// File may not exist yet
}
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));

console.log(`Bumped version to ${targetVersion} (minAppVersion: ${minAppVersion})`);
