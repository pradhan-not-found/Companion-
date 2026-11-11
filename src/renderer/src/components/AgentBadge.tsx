import type { JSX } from "react";
import type { AgentActivity, AgentSource, AgentStatus } from "../../../shared/types";
import claudeCodeLogo from "../assets/agents/claude-code.svg";
import codexLogo from "../assets/agents/codex.svg";
import deepseekLogo from "../assets/agents/deepseek.svg";
import hermesLogo from "../assets/agents/hermes.svg";
import opencodeLogo from "../assets/agents/opencode.svg";

/*
 * Official product marks (via the MIT-licensed LobeHub icon set). Monochrome
 * marks are inverted in dark mode so they stay visible. Trademarks belong to
 * their owners and are shown only to identify which tool needs you.
 */
const LOGOS: Record<AgentSource, { src: string; mono: boolean }> = {
  "Claude Code": { src: claudeCodeLogo, mono: false },
  Codex: { src: codexLogo, mono: true },
  "DeepSeek TUI": { src: deepseekLogo, mono: false },
  OpenCode: { src: opencodeLogo, mono: true },
  Hermes: { src: hermesLogo, mono: true }
};

export function AgentMark({ source, size = 18 }: { source: AgentSource; size?: number }): JSX.Element {
  const logo = LOGOS[source];
  return (
    <img
      className={`agent-logo${logo.mono ? " is-mono" : ""}`}
      src={logo.src}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}

export type AgentTone = "busy" | "attention" | "done" | "error";

export function agentTone(status: AgentStatus): AgentTone {
  if (status === "complete") return "done";
  if (status === "failed") return "error";
  if (status === "permission" || status === "choice" || status === "needs-review") return "attention";
  return "busy";
}

const STATUS_TITLE: Record<AgentStatus, string> = {
  working: "Working",
  thinking: "Thinking",
  tool: "Using tools",
  script: "Running",
  permission: "Needs your approval",
  choice: "Waiting for your choice",
  complete: "Waiting for your prompt",
  failed: "Something went wrong",
  "needs-review": "Ready for your review"
};

const CHIP_LABEL: Record<AgentTone, string> = {
  busy: "Working",
  attention: "Action needed",
  done: "Done",
  error: "Failed"
};

function StatusGlyph({ status }: { status: AgentStatus }): JSX.Element {
  const tone = agentTone(status);
  if (tone === "busy") {
    return (
      <span className="agent-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    );
  }
  return <span className={`agent-status-dot is-${tone}`} aria-hidden="true" />;
}

/** Header for speech bubbles that come from an agent: logo, name, status. */
export function AgentBubbleHeader({ activity }: { activity: AgentActivity }): JSX.Element {
  const tone = agentTone(activity.status);
  return (
    <div className="agent-bubble__head">
      <span className="agent-bubble__mark">
        <AgentMark source={activity.source} size={26} />
      </span>
      <span className="agent-bubble__titles">
        <span className="agent-bubble__source">{activity.source}</span>
        <span className="agent-bubble__status">{STATUS_TITLE[activity.status]}</span>
      </span>
      <span className={`agent-bubble__chip is-${tone}`}>
        <StatusGlyph status={activity.status} />
        {CHIP_LABEL[tone]}
      </span>
    </div>
  );
}
