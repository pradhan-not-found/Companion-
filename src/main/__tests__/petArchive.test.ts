import { describe, expect, it } from "vitest";
import { PET_ARCHIVE_LIMITS, parsePetZip } from "../petArchive";

type FixtureEntry = {
  name: string;
  data: Buffer;
  declaredSize?: number;
};

function storedZip(entries: FixtureEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const declaredSize = entry.declaredSize ?? entry.data.length;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(declaredSize, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(declaredSize, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + entry.data.length;
  }

  const centralData = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralData.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralData, eocd]);
}

describe("parsePetZip", () => {
  it("reads a small valid stored package", () => {
    const archive = storedZip([
      { name: "pet.json", data: Buffer.from("{}") },
      { name: "spritesheet.webp", data: Buffer.from("sprite") }
    ]);

    expect(parsePetZip(archive).map((entry) => entry.name)).toEqual([
      "pet.json",
      "spritesheet.webp"
    ]);
  });

  it("rejects traversal entries", () => {
    const archive = storedZip([{ name: "../outside.txt", data: Buffer.from("bad") }]);
    expect(() => parsePetZip(archive)).toThrow(/unsafe path/i);
  });

  it("rejects a declared file larger than the extraction limit before allocating it", () => {
    const archive = storedZip([
      {
        name: "spritesheet.webp",
        data: Buffer.alloc(0),
        declaredSize: PET_ARCHIVE_LIMITS.fileBytes + 1
      }
    ]);
    expect(() => parsePetZip(archive)).toThrow(/larger than 16 MB/i);
  });

  it("rejects packages with too many entries", () => {
    const entries = Array.from({ length: PET_ARCHIVE_LIMITS.entries + 1 }, (_, index) => ({
      name: `file-${index}.txt`,
      data: Buffer.alloc(0)
    }));
    expect(() => parsePetZip(storedZip(entries))).toThrow(/too many files/i);
  });
});
