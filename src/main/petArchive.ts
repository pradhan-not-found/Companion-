import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

export const PET_ARCHIVE_LIMITS = {
  archiveBytes: 25 * 1024 * 1024,
  entries: 128,
  fileBytes: 16 * 1024 * 1024,
  totalBytes: 32 * 1024 * 1024
} as const;

type ZipEntry = {
  name: string;
  data: Buffer;
};

function assertRange(data: Buffer, offset: number, length: number): void {
  if (offset < 0 || length < 0 || offset + length > data.length) {
    throw new Error("Zip package contains an invalid entry.");
  }
}

function safeEntryName(rawName: string): string {
  const name = rawName.replace(/\\/g, "/");
  if (
    !name ||
    name.includes("\0") ||
    name.startsWith("/") ||
    /^[a-zA-Z]:\//.test(name) ||
    name.split("/").some((part) => part === "..")
  ) {
    throw new Error("Zip package contains an unsafe path.");
  }
  return name.replace(/^\.\/+/, "");
}

function findEndOfCentralDirectory(data: Buffer): number {
  for (let cursor = data.length - 22; cursor >= Math.max(0, data.length - 66000); cursor -= 1) {
    if (data.readUInt32LE(cursor) === 0x06054b50) return cursor;
  }
  return -1;
}

export function parsePetZip(data: Buffer): ZipEntry[] {
  if (data.length > PET_ARCHIVE_LIMITS.archiveBytes) {
    throw new Error("Zip package is larger than 25 MB.");
  }
  const eocd = findEndOfCentralDirectory(data);
  if (eocd < 0) throw new Error("Zip package is invalid.");
  assertRange(data, eocd, 22);

  const entryCount = data.readUInt16LE(eocd + 10);
  if (entryCount > PET_ARCHIVE_LIMITS.entries) {
    throw new Error("Zip package contains too many files.");
  }
  let cursor = data.readUInt32LE(eocd + 16);
  let totalBytes = 0;
  const out: ZipEntry[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    assertRange(data, cursor, 46);
    if (data.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("Zip package central directory is invalid.");
    }
    const flags = data.readUInt16LE(cursor + 8);
    const method = data.readUInt16LE(cursor + 10);
    const compressedSize = data.readUInt32LE(cursor + 20);
    const uncompressedSize = data.readUInt32LE(cursor + 24);
    const nameLength = data.readUInt16LE(cursor + 28);
    const extraLength = data.readUInt16LE(cursor + 30);
    const commentLength = data.readUInt16LE(cursor + 32);
    const localOffset = data.readUInt32LE(cursor + 42);
    assertRange(data, cursor + 46, nameLength + extraLength + commentLength);
    const name = safeEntryName(
      data.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8")
    );

    if ((flags & 0x1) !== 0) throw new Error("Encrypted zip packages are not supported.");
    if (uncompressedSize > PET_ARCHIVE_LIMITS.fileBytes) {
      throw new Error("Zip package contains a file larger than 16 MB.");
    }
    totalBytes += uncompressedSize;
    if (totalBytes > PET_ARCHIVE_LIMITS.totalBytes) {
      throw new Error("Zip package expands beyond the 32 MB limit.");
    }

    if (!name.includes("__MACOSX/") && !name.endsWith("/")) {
      assertRange(data, localOffset, 30);
      if (data.readUInt32LE(localOffset) !== 0x04034b50) {
        throw new Error("Zip package local entry is invalid.");
      }
      const localNameLength = data.readUInt16LE(localOffset + 26);
      const localExtraLength = data.readUInt16LE(localOffset + 28);
      const fileStart = localOffset + 30 + localNameLength + localExtraLength;
      assertRange(data, fileStart, compressedSize);
      if (method !== 0 && method !== 8) {
        throw new Error(`Unsupported zip compression method: ${method}.`);
      }
      const compressed = data.subarray(fileStart, fileStart + compressedSize);
      const entryData =
        method === 0
          ? Buffer.from(compressed)
          : inflateRawSync(compressed, { maxOutputLength: PET_ARCHIVE_LIMITS.fileBytes + 1 });
      if (entryData.length !== uncompressedSize || entryData.length > PET_ARCHIVE_LIMITS.fileBytes) {
        throw new Error("Zip package entry size does not match its metadata.");
      }
      out.push({ name, data: entryData });
    }

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return out;
}

export async function extractPetZip(zipPath: string, workspace: string): Promise<string> {
  const data = await readFile(zipPath);
  const files = parsePetZip(data);
  const hasRootPetJson = files.some((file) => file.name === "pet.json");
  const rootNames = new Set(files.map((file) => file.name.split("/")[0]));
  const stripSingleRoot = !hasRootPetJson && rootNames.size === 1;
  const root = path.resolve(workspace);

  for (const file of files) {
    const relativeName = stripSingleRoot ? file.name.split("/").slice(1).join("/") : file.name;
    if (!relativeName) continue;
    const target = path.resolve(root, relativeName);
    if (target === root || !target.startsWith(`${root}${path.sep}`)) {
      throw new Error("Zip package contains an unsafe path.");
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.data);
  }

  return root;
}
