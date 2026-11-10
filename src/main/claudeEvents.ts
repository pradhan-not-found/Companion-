export type ClaudeLogSignal =
  | {
      kind: "working";
      timestampMs: number;
      id: string;
      message: string;
      progressKind: "tool";
    }
  | {
      kind: "response";
      timestampMs: number;
      id: string;
      text: string;
    };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function timestampMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hashText(input: string): string {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function parseClaudeLogRecord(value: unknown): ClaudeLogSignal | null {
  const line = record(value);
  if (!line || line.type !== "assistant") return null;
  const at = timestampMs(line.timestamp);
  const message = record(line.message);
  if (at === null || !message || !Array.isArray(message.content)) return null;

  const content = message.content.map(record).filter((part): part is Record<string, unknown> => Boolean(part));
  const toolNames = content
    .filter((part) => part.type === "tool_use")
    .map((part) => (typeof part.name === "string" ? part.name.trim() : ""))
    .filter(Boolean);
  const text = content
    .filter((part) => part.type === "text")
    .map((part) => (typeof part.text === "string" ? part.text.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
  const uuid = typeof line.uuid === "string" && line.uuid ? line.uuid : hashText(`${at}:${text}`);

  if (toolNames.length > 0) {
    return {
      kind: "working",
      timestampMs: at,
      id: `${uuid}:tool:${hashText(toolNames.join(":"))}`,
      message: toolNames.join(", "),
      progressKind: "tool"
    };
  }

  const stopReason = typeof message.stop_reason === "string" ? message.stop_reason : "";
  if (text && (stopReason === "end_turn" || stopReason === "stop_sequence")) {
    return {
      kind: "response",
      timestampMs: at,
      id: `${uuid}:response`,
      text
    };
  }

  return null;
}
