import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import type { PetDeleteResult } from "../shared/types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function deleteCompanionPet(
  companionPetsRoot: string,
  slug: string
): Promise<PetDeleteResult> {
  if (!slug || slugify(slug) !== slug) {
    return { ok: false, error: "Invalid pet identifier." };
  }

  const root = path.resolve(companionPetsRoot);
  const target = path.resolve(root, slug);
  if (target === root || !target.startsWith(`${root}${path.sep}`)) {
    return { ok: false, error: "Pet path is outside the Companion data directory." };
  }

  try {
    const targetStat = await stat(target).catch(() => null);
    if (!targetStat?.isDirectory()) {
      return { ok: false, error: "Pet is not installed by Companion." };
    }

    const rawManifest = await readFile(path.join(target, "pet.json"), "utf8");
    const manifest = JSON.parse(rawManifest) as Record<string, unknown>;
    if (manifest.source !== "imported" || slugify(String(manifest.id ?? "")) !== slug) {
      return { ok: false, error: "Pet is not managed by Companion." };
    }

    await rm(target, { recursive: true, force: false });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
