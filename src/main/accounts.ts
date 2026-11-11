import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import Store from "electron-store";
import type { AccountProfile, AccountResult } from "../shared/types";

/*
 * Local account database. Accounts live on this computer (in the app's data
 * folder); passwords are never stored — only a per-account random salt and an
 * scrypt hash. Each account gets its own data store for settings and stats.
 */

type StoredAccount = AccountProfile & {
  salt: string;
  hash: string;
  /** electron-store file name holding this account's settings and stats. */
  storeName: string;
};

type AccountsSchema = {
  accounts: StoredAccount[];
  sessionAccountId: string | null;
};

const SCRYPT_KEYLEN = 64;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

let accountsStore: Store<AccountsSchema> | null = null;

function db(): Store<AccountsSchema> {
  if (!accountsStore) {
    accountsStore = new Store<AccountsSchema>({
      name: "companion-accounts",
      defaults: { accounts: [], sessionAccountId: null }
    });
  }
  return accountsStore;
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
}

function toProfile(account: StoredAccount): AccountProfile {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    createdAt: account.createdAt
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function findByEmail(email: string): StoredAccount | undefined {
  const target = normalizeEmail(email);
  return db()
    .get("accounts")
    .find((account) => account.email === target);
}

export function accountStoreName(accountId: string): string | null {
  return db()
    .get("accounts")
    .find((account) => account.id === accountId)?.storeName ?? null;
}

export function currentAccount(): AccountProfile | null {
  const id = db().get("sessionAccountId");
  const account = db()
    .get("accounts")
    .find((entry) => entry.id === id);
  return account ? toProfile(account) : null;
}

export function hasAnyAccount(): boolean {
  return db().get("accounts").length > 0;
}

export function createAccount(input: { name: string; email: string; password: string }, legacyStoreName: string): AccountResult {
  const name = input.name.trim().slice(0, 40);
  const email = normalizeEmail(input.email);
  if (!name) return { ok: false, error: "Please enter your name." };
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (input.password.length < 8) return { ok: false, error: "Use at least 8 characters for your password." };
  if (findByEmail(email)) return { ok: false, error: "An account with this email already exists. Try signing in." };

  const accounts = db().get("accounts");
  const id = randomUUID();
  const salt = randomBytes(16).toString("hex");
  const account: StoredAccount = {
    id,
    name,
    email,
    createdAt: Date.now(),
    salt,
    hash: hashPassword(input.password, salt),
    // The first account adopts the data that existed before accounts, so
    // upgrading never loses stats or settings.
    storeName: accounts.length === 0 ? legacyStoreName : `${legacyStoreName}-${id.slice(0, 8)}`
  };
  db().set("accounts", [...accounts, account]);
  db().set("sessionAccountId", id);
  return { ok: true, account: toProfile(account), created: true };
}

export function signIn(input: { email: string; password: string }): AccountResult {
  const account = findByEmail(input.email);
  // Hash even when the account doesn't exist, so response time doesn't leak it.
  const salt = account?.salt ?? "0".repeat(32);
  const expected = Buffer.from(account?.hash ?? "0".repeat(SCRYPT_KEYLEN * 2), "hex");
  const actual = Buffer.from(hashPassword(input.password, salt), "hex");
  if (!account || !timingSafeEqual(expected, actual)) {
    return { ok: false, error: "That email and password don't match." };
  }
  db().set("sessionAccountId", account.id);
  return { ok: true, account: toProfile(account), created: false };
}

export function signOut(): void {
  db().set("sessionAccountId", null);
}

export function updateProfile(id: string, changes: { name?: string; email?: string }): AccountResult {
  const accounts = db().get("accounts");
  const account = accounts.find((entry) => entry.id === id);
  if (!account) return { ok: false, error: "Account not found." };
  const next = { ...account };
  if (changes.name !== undefined) {
    const name = changes.name.trim().slice(0, 40);
    if (!name) return { ok: false, error: "Your name can't be empty." };
    next.name = name;
  }
  if (changes.email !== undefined) {
    const email = normalizeEmail(changes.email);
    if (!EMAIL_PATTERN.test(email)) return { ok: false, error: "Please enter a valid email address." };
    const owner = findByEmail(email);
    if (owner && owner.id !== id) return { ok: false, error: "Another account already uses this email." };
    next.email = email;
  }
  db().set(
    "accounts",
    accounts.map((entry) => (entry.id === id ? next : entry))
  );
  return { ok: true, account: toProfile(next), created: false };
}

export function changePassword(id: string, currentPassword: string, newPassword: string): AccountResult {
  const accounts = db().get("accounts");
  const account = accounts.find((entry) => entry.id === id);
  if (!account) return { ok: false, error: "Account not found." };
  const expected = Buffer.from(account.hash, "hex");
  const actual = Buffer.from(hashPassword(currentPassword, account.salt), "hex");
  if (!timingSafeEqual(expected, actual)) return { ok: false, error: "Your current password is incorrect." };
  if (newPassword.length < 8) return { ok: false, error: "Use at least 8 characters for your new password." };
  const salt = randomBytes(16).toString("hex");
  const next = { ...account, salt, hash: hashPassword(newPassword, salt) };
  db().set(
    "accounts",
    accounts.map((entry) => (entry.id === id ? next : entry))
  );
  return { ok: true, account: toProfile(next), created: false };
}
