import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for electron-store (which needs a running Electron app).
const memory = new Map<string, unknown>();
vi.mock("electron-store", () => ({
  default: class {
    private readonly defaults: Record<string, unknown>;
    constructor(options: { defaults: Record<string, unknown> }) {
      this.defaults = options.defaults;
    }
    get(key: string): unknown {
      return memory.has(key) ? memory.get(key) : this.defaults[key];
    }
    set(key: string, value: unknown): void {
      memory.set(key, value);
    }
  }
}));

const accounts = await import("../accounts");

describe("local accounts", () => {
  beforeEach(() => memory.clear());

  it("creates an account, signs it in, and never stores the password", () => {
    const result = accounts.createAccount({ name: "Alex", email: "Alex@Example.com", password: "companion123" }, "companion");
    expect(result.ok).toBe(true);
    expect(accounts.currentAccount()?.email).toBe("alex@example.com");
    expect(JSON.stringify([...memory.values()])).not.toContain("companion123");
  });

  it("gives the first account the pre-existing data store and later ones their own", () => {
    const first = accounts.createAccount({ name: "A", email: "a@example.com", password: "password1" }, "companion");
    const second = accounts.createAccount({ name: "B", email: "b@example.com", password: "password2" }, "companion");
    if (!first.ok || !second.ok) throw new Error("setup failed");
    expect(accounts.accountStoreName(first.account.id)).toBe("companion");
    expect(accounts.accountStoreName(second.account.id)).not.toBe("companion");
  });

  it("rejects bad input and duplicate emails", () => {
    expect(accounts.createAccount({ name: "", email: "a@example.com", password: "password1" }, "c").ok).toBe(false);
    expect(accounts.createAccount({ name: "A", email: "not-an-email", password: "password1" }, "c").ok).toBe(false);
    expect(accounts.createAccount({ name: "A", email: "a@example.com", password: "short" }, "c").ok).toBe(false);
    accounts.createAccount({ name: "A", email: "a@example.com", password: "password1" }, "c");
    expect(accounts.createAccount({ name: "B", email: "A@EXAMPLE.COM", password: "password2" }, "c").ok).toBe(false);
  });

  it("signs in only with the right password", () => {
    accounts.createAccount({ name: "A", email: "a@example.com", password: "password1" }, "c");
    accounts.signOut();
    expect(accounts.currentAccount()).toBeNull();
    expect(accounts.signIn({ email: "a@example.com", password: "wrong-pass" }).ok).toBe(false);
    expect(accounts.signIn({ email: "nobody@example.com", password: "password1" }).ok).toBe(false);
    expect(accounts.signIn({ email: "A@example.com", password: "password1" }).ok).toBe(true);
    expect(accounts.currentAccount()?.name).toBe("A");
  });

  it("updates the profile and changes the password", () => {
    const created = accounts.createAccount({ name: "A", email: "a@example.com", password: "password1" }, "c");
    if (!created.ok) throw new Error("setup failed");
    expect(accounts.updateProfile(created.account.id, { name: "Alex", email: "new@example.com" }).ok).toBe(true);
    expect(accounts.currentAccount()).toMatchObject({ name: "Alex", email: "new@example.com" });
    expect(accounts.changePassword(created.account.id, "wrong", "password2").ok).toBe(false);
    expect(accounts.changePassword(created.account.id, "password1", "password2").ok).toBe(true);
    accounts.signOut();
    expect(accounts.signIn({ email: "new@example.com", password: "password1" }).ok).toBe(false);
    expect(accounts.signIn({ email: "new@example.com", password: "password2" }).ok).toBe(true);
  });
});
