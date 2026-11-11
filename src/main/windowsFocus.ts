import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";

/*
 * Windows foreground-window access for focus mode.
 *
 * One long-lived, hidden PowerShell process hosts a few user32 calls and
 * answers line-based requests on stdin/stdout, so polling every couple of
 * seconds costs a few milliseconds instead of spawning a process each time.
 */

export type WindowsActiveWindow = {
  appName: string;
  windowTitle: string;
  hwnd: string;
  pid: number;
};

type HelperReply = {
  ok: boolean;
  hwnd?: string;
  pid?: number;
  app?: string;
  title?: string;
  error?: string;
};

const HELPER_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [Text.Encoding]::UTF8
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public static class CompanionWin {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
}
"@
function Reply($obj) { [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress)); [Console]::Out.Flush() }
function Foreground() { return [Int64][CompanionWin]::GetForegroundWindow() }
Reply @{ ok = $true; ready = $true }
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  $parts = $line.Trim().Split(' ')
  try {
    switch ($parts[0]) {
      'poll' {
        $h = [CompanionWin]::GetForegroundWindow()
        $sb = New-Object Text.StringBuilder 1024
        [void][CompanionWin]::GetWindowText($h, $sb, 1024)
        $procId = [uint32]0
        [void][CompanionWin]::GetWindowThreadProcessId($h, [ref]$procId)
        $name = ''
        try { $name = (Get-Process -Id $procId).ProcessName } catch {}
        Reply @{ ok = $true; hwnd = [string][Int64]$h; pid = [int]$procId; app = $name; title = $sb.ToString() }
      }
      'closetab' {
        # Ctrl+W closes only the active tab, and only if that window is still in front.
        if ((Foreground) -ne [Int64]$parts[1]) { Reply @{ ok = $false; error = 'not-foreground' }; break }
        [CompanionWin]::keybd_event(0x11, 0, 0, [UIntPtr]::Zero)
        [CompanionWin]::keybd_event(0x57, 0, 0, [UIntPtr]::Zero)
        [CompanionWin]::keybd_event(0x57, 0, 2, [UIntPtr]::Zero)
        [CompanionWin]::keybd_event(0x11, 0, 2, [UIntPtr]::Zero)
        Reply @{ ok = $true }
      }
      'closewin' {
        $h = [IntPtr][Int64]$parts[1]
        if (-not [CompanionWin]::IsWindow($h)) { Reply @{ ok = $false; error = 'gone' }; break }
        [void][CompanionWin]::PostMessage($h, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
        Reply @{ ok = $true }
      }
      'kill' {
        Stop-Process -Id ([int]$parts[1]) -Force
        Reply @{ ok = $true }
      }
      default { Reply @{ ok = $false; error = 'unknown-command' } }
    }
  } catch {
    Reply @{ ok = $false; error = $_.Exception.Message }
  }
}
`;

let helper: ChildProcessWithoutNullStreams | null = null;
let ready: Promise<void> | null = null;
const pending: Array<(reply: HelperReply) => void> = [];
let queue: Promise<unknown> = Promise.resolve();

function stopHelper(): void {
  const current = helper;
  helper = null;
  ready = null;
  while (pending.length) pending.shift()?.({ ok: false, error: "helper-stopped" });
  if (current && !current.killed) current.kill();
}

function startHelper(): Promise<void> {
  if (helper && ready) return ready;
  const encoded = Buffer.from(HELPER_SCRIPT, "utf16le").toString("base64");
  const child = spawn(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
    { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }
  );
  helper = child;
  child.stdin.setDefaultEncoding("utf8");
  child.on("exit", () => {
    if (helper === child) stopHelper();
  });
  child.on("error", () => {
    if (helper === child) stopHelper();
  });
  child.stderr.resume();

  ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Focus helper did not start")), 15_000);
    let first = true;
    createInterface({ input: child.stdout }).on("line", (line) => {
      let reply: HelperReply;
      try {
        reply = JSON.parse(line) as HelperReply;
      } catch {
        return;
      }
      if (first) {
        first = false;
        clearTimeout(timer);
        resolve();
        return;
      }
      pending.shift()?.(reply);
    });
  });
  ready.catch(() => stopHelper());
  return ready;
}

function request(command: string, timeoutMs = 4000): Promise<HelperReply> {
  // Serialize requests so replies always pair with the right caller.
  const run = async (): Promise<HelperReply> => {
    await startHelper();
    const child = helper;
    if (!child) throw new Error("Focus helper unavailable");
    return new Promise<HelperReply>((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = pending.indexOf(onReply);
        if (index >= 0) pending.splice(index, 1);
        stopHelper();
        reject(new Error("Focus helper timed out"));
      }, timeoutMs);
      const onReply = (reply: HelperReply): void => {
        clearTimeout(timer);
        resolve(reply);
      };
      pending.push(onReply);
      child.stdin.write(`${command}\n`);
    });
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}

export async function readWindowsActiveWindow(): Promise<WindowsActiveWindow> {
  const reply = await request("poll");
  if (!reply.ok) throw new Error(reply.error ?? "Could not read the active window");
  return {
    appName: reply.app ?? "",
    windowTitle: reply.title ?? "",
    hwnd: reply.hwnd ?? "0",
    pid: reply.pid ?? 0
  };
}

/** Closes the active browser tab (Ctrl+W) if `hwnd` is still the foreground window. */
export async function closeActiveTab(hwnd: string): Promise<boolean> {
  if (!/^\d+$/.test(hwnd)) return false;
  return (await request(`closetab ${hwnd}`)).ok;
}

/** Asks a window to close, like clicking its X button. */
export async function closeWindow(hwnd: string): Promise<boolean> {
  if (!/^\d+$/.test(hwnd)) return false;
  return (await request(`closewin ${hwnd}`)).ok;
}

export async function killProcess(pid: number): Promise<boolean> {
  if (!Number.isInteger(pid) || pid <= 4 || pid === process.pid) return false;
  return (await request(`kill ${pid}`)).ok;
}

export function shutdownWindowsFocusHelper(): void {
  stopHelper();
}
