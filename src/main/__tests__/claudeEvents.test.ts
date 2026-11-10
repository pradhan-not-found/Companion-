import { describe, expect, it } from "vitest";
import { parseClaudeLogRecord } from "../claudeEvents";

const timestamp = "2026-07-30T05:00:00.000Z";

describe("parseClaudeLogRecord", () => {
  it("accepts the current Claude Code stop_sequence completion format", () => {
    expect(
      parseClaudeLogRecord({
        type: "assistant",
        timestamp,
        uuid: "new-format",
        message: {
          stop_reason: "stop_sequence",
          content: [{ type: "text", text: "The requested change is ready." }]
        }
      })
    ).toMatchObject({
      kind: "response",
      id: "new-format:response",
      text: "The requested change is ready."
    });
  });

  it("keeps compatibility with the older end_turn completion format", () => {
    expect(
      parseClaudeLogRecord({
        type: "assistant",
        timestamp,
        uuid: "old-format",
        message: {
          stop_reason: "end_turn",
          content: [{ type: "text", text: "Done." }]
        }
      })
    ).toMatchObject({ kind: "response", id: "old-format:response" });
  });

  it("detects tool use from content instead of relying on stop_reason", () => {
    expect(
      parseClaudeLogRecord({
        type: "assistant",
        timestamp,
        uuid: "tool-format",
        message: {
          stop_reason: "stop_sequence",
          content: [
            { type: "text", text: "I will inspect it." },
            { type: "tool_use", name: "Read" }
          ]
        }
      })
    ).toMatchObject({
      kind: "working",
      message: "Read",
      progressKind: "tool"
    });
  });

  it("ignores metadata entries without a timestamp", () => {
    expect(
      parseClaudeLogRecord({
        type: "last-prompt",
        lastPrompt: "metadata without a timestamp"
      })
    ).toBeNull();
  });
});
