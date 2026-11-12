import { execFileSync } from "node:child_process";
import { createHash, createPublicKey, randomUUID, verify } from "node:crypto";
import { hostname, userInfo } from "node:os";
import electron from "electron";
import Store from "electron-store";
import { LICENSE_PUBLIC_KEY } from "./licensePublicKey";

/**
 * Companion licensing.
 *
 * A license key is bought on the website and belongs to one Companion account (the first account that
 * activates it) and a limited number of computers. Activation happens on the server, which signs the
 * approval with a private Ed25519 key. The app trusts only approvals whose signature verifies against
 * the public key compiled in here, for the same key, account email and computer.
 *
 * Approvals last 30 days and refresh in the background. Without internet the app keeps working for a
 * 14-day grace period after an approval expires.
 */

const { net } = electron;

const ACTIVATE_URL =
  !electron.app.isPackaged && process.env.COMPANION_LICENSE_URL
    ? process.env.COMPANION_LICENSE_URL
    : "https://trycompanion.vercel.app/api/license/activate";
const GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const KEY_PATTERN = /^CMPN-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

type Approval = { payload: string; signature: string };
type ApprovalBody = { v: number; key: string; email: string; device: string; issuedAt: number; expiresAt: number };

export type LicenseState =
  | { status: "active"; key: string; email: string; expiresAt: number }
  | { status: "required"; reason?: string };

const publicKey = createPublicKey(LICENSE_PUBLIC_KEY);

let deviceCache: string | null = null;
let licenseStore: Store<Record<string, Approval>> | null = null;

function storeFor(): Store<Record<string, Approval>> {
  if (!licenseStore) {
    // Bound to this computer: the file can't simply be copied to another PC and decrypted.
    licenseStore = new Store<Record<string, Approval>>({ name: "companion-license", encryptionKey: `cmp-${deviceId()}` });
  }
  return licenseStore;
}

function windowsMachineGuid(): string {
  if (process.platform !== "win32") return "";
  try {
    const output = execFileSync("reg", ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 4000
    });
    return /MachineGuid\s+REG_SZ\s+([\w-]+)/i.exec(output)?.[1] ?? "";
  } catch {
    return "";
  }
}

/** A stable, anonymous id for this computer (a hash; nothing personal is sent). */
export function deviceId(): string {
  if (deviceCache) return deviceCache;
  const local = new Store<{ install?: string }>({ name: "companion-device" });
  let install = local.get("install");
  if (!install) {
    install = randomUUID();
    local.set("install", install);
  }
  const machine = windowsMachineGuid() || install;
  let user = "";
  try {
    user = userInfo().username;
  } catch {
    // ignore
  }
  deviceCache = createHash("sha256").update(`companion|${machine}|${hostname()}|${user}`).digest("hex").slice(0, 32);
  return deviceCache;
}

function readApproval(approval: Approval | undefined, email: string): ApprovalBody | null {
  if (!approval || typeof approval.payload !== "string" || typeof approval.signature !== "string") return null;
  try {
    const valid = verify(null, Buffer.from(approval.payload), publicKey, Buffer.from(approval.signature, "base64"));
    if (!valid) return null;
    const body = JSON.parse(approval.payload) as ApprovalBody;
    if (body.v !== 1 || body.email !== email.toLowerCase() || body.device !== deviceId() || !KEY_PATTERN.test(body.key)) return null;
    return body;
  } catch {
    return null;
  }
}

/** Current license state for an account, from the stored signed approval (no network). */
export function licenseState(accountId: string, email: string): LicenseState {
  const body = readApproval(storeFor().get(accountId), email);
  if (!body) return { status: "required" };
  if (Date.now() > body.expiresAt + GRACE_MS) return { status: "required", reason: "Connect to the internet to confirm your license." };
  return { status: "active", key: body.key, email: body.email, expiresAt: body.expiresAt };
}

export function normalizeKey(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.startsWith("CMPN") ? raw.slice(4) : raw;
  const groups = body.slice(0, 12).match(/.{1,4}/g) ?? [];
  return ["CMPN", ...groups].join("-");
}

/** Asks the server to activate a key for this account and computer, and stores the signed approval. */
export async function activateLicense(
  accountId: string,
  email: string,
  input: string
): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  const key = normalizeKey(input);
  if (!KEY_PATTERN.test(key)) return { ok: false, error: "Enter the license key from your email, like CMPN-XXXX-XXXX-XXXX." };
  let response: Response;
  try {
    response = await net.fetch(ACTIVATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, email: email.toLowerCase(), device: deviceId() })
    });
  } catch {
    return { ok: false, error: "Couldn't reach Companion. Check your internet connection and try again." };
  }
  let data: { ok?: boolean; error?: string; code?: string; payload?: string; signature?: string } = {};
  try {
    data = (await response.json()) as typeof data;
  } catch {
    return { ok: false, error: "Couldn't check the license. Try again shortly." };
  }
  if (!data.ok || !data.payload || !data.signature) return { ok: false, error: data.error ?? "That license couldn't be activated.", code: data.code };
  const approval = { payload: data.payload, signature: data.signature };
  const body = readApproval(approval, email);
  if (!body || body.key !== key) return { ok: false, error: "The license response couldn't be verified." };
  storeFor().set(accountId, approval);
  return { ok: true };
}

// Answers that mean the license is no longer valid (as opposed to "offline, try later").
const FINAL_CODES = new Set(["revoked", "other-account", "not-found", "not-verified"]);

/**
 * Re-checks the license with the server (the app calls this at launch and every hour).
 * A revoked or invalid license is removed right away; when offline, the stored approval
 * keeps working until it expires plus the grace period.
 */
export async function refreshLicense(accountId: string, email: string): Promise<LicenseState> {
  const stored = readApproval(storeFor().get(accountId), email);
  if (!stored) return licenseState(accountId, email);
  const result = await activateLicense(accountId, email, stored.key);
  if (!result.ok && result.code && FINAL_CODES.has(result.code)) storeFor().delete(accountId);
  return licenseState(accountId, email);
}

export function removeLicense(accountId: string): void {
  storeFor().delete(accountId);
}
