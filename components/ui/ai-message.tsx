"use client";

import { cn } from "@/lib/utils";
import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp, Sparkles } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { MaybachLogo } from "@/app/components/Branding";

const COPIED_RESET_MS = 1600;
const ACTION_STAGGER_MS = 30;

const ACTION_STYLES = `
.ai-message-action {
  opacity: 0;
  transform: translateX(var(--ai-message-slide)) scale(0.92);
  transition:
    opacity 220ms cubic-bezier(.23, 1, .32, 1),
    transform 220ms cubic-bezier(.23, 1, .32, 1),
    background-color 150ms ease,
    color 150ms ease;
}
.ai-message-action-agent { --ai-message-slide: -8px; }
.ai-message-action-user { --ai-message-slide: 8px; }
.ai-message-root:hover .ai-message-action,
.ai-message-root:focus-within .ai-message-action {
  opacity: 1;
  transform: translateX(0) scale(1);
}
.ai-message-pop { animation: ai-message-pop 250ms cubic-bezier(.23, 1, .32, 1); }
@keyframes ai-message-pop {
  0% { transform: scale(1); }
  45% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .ai-message-action { transition-duration: 0ms; transition-delay: 0ms !important; transform: none; }
  .ai-message-root:hover .ai-message-action,
  .ai-message-root:focus-within .ai-message-action { transform: none; }
  .ai-message-pop { animation: none; }
}
`;

export type AIMessageAuthor = "user" | "assistant";

export type AIMessageProps = {
  /** Rendered to the side of the bubble — an avatar or an orb. */
  avatar?: ReactNode;
  /**
   * Draw the tinted bubble surface.
   */
  bubble?: boolean;
  children: ReactNode;
  className?: string;
  /** Plain text handed to the clipboard. Omit to hide the copy action. */
  copyText?: string;
  from?: AIMessageAuthor;
  onRetry?: () => void;
  onVote?: (vote: "up" | "down") => void;
  /** Extra custom actions */
  customActions?: ReactNode;
  /** Preformatted timestamp, e.g. "14:32". */
  timestamp?: string;
};

/**
 * Hyper-Refined AI Message Bubble with Luxury Obsidian Glass Aesthetics
 */
const AIMessage = ({
  avatar,
  bubble = true,
  children,
  className,
  copyText,
  onRetry,
  onVote,
  customActions,
  from = "assistant",
  timestamp,
}: AIMessageProps) => {
  const [hasCopied, setHasCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  const isUser = from === "user";

  useEffect(() => {
    if (!hasCopied) return;
    const timeout = setTimeout(() => setHasCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timeout);
  }, [hasCopied]);

  const copy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setHasCopied(true);
    } catch {
      // Fallback
    }
  };

  const defaultAvatar = isUser ? (
    <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/80 shadow-sm shrink-0">
      <span className="text-[9px] font-mono font-bold">U</span>
    </div>
  ) : (
    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/15 flex items-center justify-center shadow-sm shrink-0">
      <MaybachLogo size={14} glow={false} className="opacity-80" />
    </div>
  );

  const actions = [
    copyText
      ? {
          active: hasCopied,
          icon: hasCopied ? Check : Copy,
          key: "copy",
          label: hasCopied ? "Copied" : "Copy text",
          onClick: copy,
        }
      : null,
    onRetry
      ? {
          active: false,
          icon: RotateCcw,
          key: "retry",
          label: "Regenerate response",
          onClick: onRetry,
        }
      : null,
    onVote && !isUser
      ? {
          active: vote === "up",
          icon: ThumbsUp,
          key: "up",
          label: "Helpful",
          onClick: () => {
            setVote(vote === "up" ? null : "up");
            onVote("up");
          },
        }
      : null,
    onVote && !isUser
      ? {
          active: vote === "down",
          icon: ThumbsDown,
          key: "down",
          label: "Needs improvement",
          onClick: () => {
            setVote(vote === "down" ? null : "down");
            onVote("down");
          },
        }
      : null,
  ].filter((action): action is NonNullable<typeof action> => action !== null);

  return (
    <div
      className={cn(
        "ai-message-root flex w-full gap-2.5 py-1 group/msg relative",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      <style dangerouslySetInnerHTML={{ __html: ACTION_STYLES }} />

      {/* Avatar */}
      <div className="mt-0.5 shrink-0">{avatar || defaultAvatar}</div>

      <div className={cn("flex min-w-0 flex-col gap-1 max-w-[85%]", isUser ? "items-end" : "items-start")}>
        {/* Message Bubble Card */}
        <div
          className={cn(
            "w-fit text-xs leading-relaxed transition-all",
            bubble && [
              "rounded-2xl px-3.5 py-2.5 shadow-md",
              isUser
                ? "rounded-tr-xs bg-white/[0.07] border border-white/12 text-white shadow-md backdrop-blur-xl"
                : "rounded-tl-xs bg-[#09090c]/90 border border-white/[0.08] text-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-3xl ring-1 ring-white/5",
            ],
            !bubble && "text-white/90"
          )}
        >
          {children}
        </div>

        {/* Action Row & Timestamp */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-1",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          {timestamp && (
            <span className="text-white/35 text-[10px] font-mono tracking-tight tabular-nums select-none">
              {timestamp}
            </span>
          )}

          {/* Action buttons */}
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                aria-label={action.label}
                aria-pressed={action.active}
                className={cn(
                  "ai-message-action cursor-pointer rounded-lg p-1 transition-all",
                  isUser ? "ai-message-action-user" : "ai-message-action-agent",
                  action.active
                    ? "text-cyan-400 bg-cyan-400/15 ring-1 ring-cyan-400/30"
                    : "text-white/40 hover:bg-white/10 hover:text-white"
                )}
                key={action.key}
                onClick={action.onClick}
                style={{ transitionDelay: `${index * ACTION_STAGGER_MS}ms` }}
                type="button"
                title={action.label}
              >
                <Icon
                  aria-hidden="true"
                  className={
                    action.key === "copy" && hasCopied
                      ? "ai-message-pop text-emerald-400"
                      : undefined
                  }
                  size={12}
                />
              </button>
            );
          })}

          {customActions}
        </div>
      </div>
    </div>
  );
};

export { AIMessage };
export default AIMessage;
