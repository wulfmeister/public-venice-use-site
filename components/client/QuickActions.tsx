"use client";

import { CONSTANTS } from "@/lib/constants";

type QuickActionsVariant = "empty" | "inline";

export default function QuickActions({
  variant = "empty",
}: {
  variant?: QuickActionsVariant;
}) {
  const isInline = variant === "inline";

  const handleQuickAction = async (
    action: (typeof CONSTANTS.QUICK_ACTIONS)[number],
  ) => {
    // Handle image generation specially - trigger the image generation flow
    if ("action" in action && action.action === "generateImage") {
      const event = new CustomEvent("enterImageGenerationMode", { detail: {} });
      window.dispatchEvent(event);
      return;
    }

    // For text prompts, auto-send the message
    const prompt = "prompt" in action ? action.prompt : "";
    const event = new CustomEvent("sendQuickAction", {
      detail: { prompt, autoSend: true },
    });
    window.dispatchEvent(event);
  };

  return (
    <div
      className={`quick-actions ${isInline ? "mt-0" : "mt-6"} ${isInline ? "" : "p-4"}`}
    >
      {!isInline && (
        <div className="quick-actions-title text-sm font-semibold tracking-wide uppercase text-center text-[var(--text-secondary)] mb-4">
          Quick Actions
        </div>
      )}
      <div
        className={
          isInline
            ? "flex gap-2 overflow-x-auto pb-1"
            : "quick-actions-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl mx-auto"
        }
      >
        {CONSTANTS.QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => handleQuickAction(action)}
            className={
              isInline
                ? "quick-action-btn whitespace-nowrap bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-200 flex items-center gap-2 hover:bg-[var(--shadow-light)] hover:border-[var(--accent)] hover:translate-y-[-1px] hover:shadow-md"
                : "quick-action-btn bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] text-[var(--text-primary)] px-4 py-3 rounded-2xl text-sm font-medium cursor-pointer transition-all duration-200 text-left flex items-center gap-2 hover:bg-[var(--shadow-light)] hover:border-[var(--accent)] hover:translate-y-[-2px] hover:shadow-lg"
            }
          >
            <span
              className={
                isInline ? "text-base flex-shrink-0" : "text-lg flex-shrink-0"
              }
            >
              {action.icon}
            </span>
            <span className="qa-text flex-1">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
