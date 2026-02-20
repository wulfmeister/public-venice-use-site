"use client";

import { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { Lock } from "lucide-react";

export default function PasswordGate() {
  const { hydrated, passwordRequired, passwordAccepted, submitPassword } = useApp();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus trap + keyboard handling
  useEffect(() => {
    if (!passwordRequired || passwordAccepted) return;

    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
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
  }, [passwordRequired, passwordAccepted]);

  if (!hydrated || !passwordRequired || passwordAccepted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || submitting) return;

    setError("");
    setSubmitting(true);

    const success = await submitPassword(password.trim());
    if (!success) {
      setError("Incorrect password. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="pw-heading">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div ref={dialogRef} className="relative z-[111] w-full max-w-md rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="flex items-start gap-3">
          <Lock className="w-7 h-7 text-[var(--accent)] flex-shrink-0" />
          <div>
            <h2 id="pw-heading" className="text-xl font-semibold text-[var(--text-primary)]">
              Password Required
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
              This instance is password-protected. Enter the password to continue.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !password.trim()}
              className="btn-gradient border-none text-[var(--button-text)] px-6 py-3 rounded-2xl cursor-pointer font-semibold transition-all duration-100 hover:translate-y-[-2px] hover:shadow-lg uppercase text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {submitting ? "Verifying..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
