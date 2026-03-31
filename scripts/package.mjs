import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
	let c = i;
	for (let j = 0; j < 8; j++) {
		c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	}
	CRC32_TABLE[i] = c >>> 0;
}

function crc32(buffer) {
	let crc = 0xffffffff;
	for (const byte of buffer) {
		crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

const root = resolve(process.cwd());
const distDir = resolve(root, "dist");
if (!existsSync(distDir)) {
	mkdirSync(distDir, { recursive: true });
}

const manifestPath = resolve(root, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const pluginId = manifest.id || "arena-sync";
const version = manifest.version || "0.0.0";
const zipName = `${pluginId}-${version}.zip`;
const zipPath = resolve(distDir, zipName);

const files = ["main.js", "manifest.json", "styles.css"].map((file) => ({
	name: file,
	path: resolve(root, file),
}));

const localParts = [];
const centralParts = [];
let offset = 0;

for (const file of files) {
	const fileName = Buffer.from(file.name, "utf8");
	const data = readFileSync(file.path);
	const checksum = crc32(data);
	const size = data.length;

	const localHeader = Buffer.alloc(30);
	localHeader.writeUInt32LE(0x04034b50, 0);
	localHeader.writeUInt16LE(20, 4);
	localHeader.writeUInt16LE(0, 6);
	localHeader.writeUInt16LE(0, 8);
	localHeader.writeUInt16LE(0, 10);
	localHeader.writeUInt16LE(0, 12);
	localHeader.writeUInt32LE(checksum, 14);
	localHeader.writeUInt32LE(size, 18);
	localHeader.writeUInt32LE(size, 22);
	localHeader.writeUInt16LE(fileName.length, 26);
	localHeader.writeUInt16LE(0, 28);
	localParts.push(localHeader, fileName, data);

	const centralHeader = Buffer.alloc(46);
	centralHeader.writeUInt32LE(0x02014b50, 0);
	centralHeader.writeUInt16LE(20, 4);
	centralHeader.writeUInt16LE(20, 6);
	centralHeader.writeUInt16LE(0, 8);
	centralHeader.writeUInt16LE(0, 10);
	centralHeader.writeUInt16LE(0, 12);
	centralHeader.writeUInt16LE(0, 14);
	centralHeader.writeUInt32LE(checksum, 16);
	centralHeader.writeUInt32LE(size, 20);
	centralHeader.writeUInt32LE(size, 24);
	centralHeader.writeUInt16LE(fileName.length, 28);
	centralHeader.writeUInt16LE(0, 30);
	centralHeader.writeUInt16LE(0, 32);
	centralHeader.writeUInt16LE(0, 34);
	centralHeader.writeUInt16LE(0, 36);
	centralHeader.writeUInt32LE(0, 38);
	centralHeader.writeUInt32LE(offset, 42);
	centralParts.push(centralHeader, fileName);

	offset += localHeader.length + fileName.length + data.length;
}

const centralDirectory = Buffer.concat(centralParts);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(centralDirectory.length, 12);
eocd.writeUInt32LE(offset, 16);
eocd.writeUInt16LE(0, 20);

const zipBuffer = Buffer.concat([...localParts, centralDirectory, eocd]);
writeFileSync(zipPath, zipBuffer);
console.log(`Packaged ${zipPath}`);
