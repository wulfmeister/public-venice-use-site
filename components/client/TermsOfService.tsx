"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { Waves } from "lucide-react";

export default function TermsOfService() {
  const { hydrated, tosAccepted, acceptTos } = useApp();
  const dialogRef = useRef<HTMLDivElement>(null);
  const acceptBtnRef = useRef<HTMLButtonElement>(null);

  // Focus trap + Escape key
  useEffect(() => {
    if (tosAccepted) return;

    // Focus the accept button on mount
    acceptBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [tosAccepted]);

  if (!hydrated || tosAccepted) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="tos-heading">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div ref={dialogRef} className="relative z-[101] w-full max-w-2xl rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="flex items-start gap-3">
          <Waves className="w-7 h-7 text-[var(--accent)] flex-shrink-0" />
          <div>
            <h2 id="tos-heading" className="text-xl font-semibold text-[var(--text-primary)]">
              Accept Terms to Continue
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
              By using Community Chat, you agree to our{" "}
              <button
                type="button"
                onClick={() => {
                  document
                    .getElementById("terms-content")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-[var(--text-primary)] underline hover:text-[var(--text-secondary)] bg-transparent border-none p-0 cursor-pointer font-inherit text-inherit"
              >
                Terms of Service
              </button>
              . You are responsible for all content you generate.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            No data is stored without consent.
          </span>
          <button
            ref={acceptBtnRef}
            onClick={acceptTos}
            className="tos-btn btn-gradient border-none text-[var(--button-text)] px-6 py-3 rounded-2xl cursor-pointer font-semibold transition-all duration-100 hover:translate-y-[-2px] hover:shadow-lg uppercase text-sm tracking-wide"
          >
            I Accept
          </button>
        </div>
      </div>
    </div>
  );
}
