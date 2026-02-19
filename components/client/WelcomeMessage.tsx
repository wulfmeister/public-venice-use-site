"use client";

import { Waves } from "lucide-react";
import { CONSTANTS } from "@/lib/constants";

interface WelcomeMessageProps {
  variant?: "default" | "tos";
}

export default function WelcomeMessage({
  variant = "default",
}: WelcomeMessageProps) {
  if (variant === "tos") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Waves className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-ui text-3xl font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 tracking-tight">
            Welcome to OpenChat!
          </h2>
          <p className="text-[var(--text-secondary)]">
            Please accept the Terms of Service to continue.
          </p>
        </div>
      </div>
    );
  }

  const handleQuickAction = (action: (typeof CONSTANTS.QUICK_ACTIONS)[number]) => {
    if ("action" in action && action.action === "generateImage") {
      window.dispatchEvent(new CustomEvent("enterImageGenerationMode", { detail: {} }));
      return;
    }
    const prompt = "prompt" in action ? action.prompt : "";
    window.dispatchEvent(
      new CustomEvent("sendQuickAction", { detail: { prompt, autoSend: true } }),
    );
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-2xl w-full text-center px-4">
        {/* Gradient icon */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Waves className="w-8 h-8 text-white" />
        </div>

        {/* Gradient heading */}
        <h2 className="font-ui text-3xl font-semibold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 tracking-tight">
          Welcome to OpenChat!
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-8">
          A free community AI assistant powered by Venice
        </p>

        {/* Card grid — doubles as Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
          {CONSTANTS.QUICK_ACTIONS.map((action, index) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action)}
              className="welcome-card group flex flex-col items-center gap-2 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] cursor-pointer transition-all duration-200 hover:bg-[var(--shadow-light)] hover:border-[var(--accent)] hover:translate-y-[-2px] hover:shadow-lg"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-xs font-medium leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
