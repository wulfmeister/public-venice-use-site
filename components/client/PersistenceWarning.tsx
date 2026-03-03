"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";

export default function PersistenceWarning() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed =
      localStorage.getItem("persistenceWarningDismissed") === "true";
    if (!dismissed) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("persistenceWarningDismissed", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] text-xs rounded-lg max-w-5xl mx-auto my-2 px-4 py-3 flex items-start gap-3 animate-fade-in">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p>
          Your chats are saved in this browser only. They won't transfer to
          other devices or browsers.
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--bg-tertiary)] transition-colors"
        aria-label="Dismiss warning"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
