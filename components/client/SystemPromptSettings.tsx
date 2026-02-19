'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ChevronDown } from 'lucide-react';

export default function SystemPromptSettings() {
  const { systemPrompt, setSystemPrompt } = useApp();
  const [collapsed, setCollapsed] = useState(true);
  const [draft, setDraft] = useState(systemPrompt);
  const [saved, setSaved] = useState(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setDraft(systemPrompt); }, [systemPrompt]);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  const handleSave = () => {
    setSystemPrompt(draft.trim());
    setSaved(true);
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setDraft('');
    setSystemPrompt('');
  };

  const isDirty = draft.trim() !== systemPrompt;

  return (
    <div className="border-b border-[var(--border-color)]">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--shadow-light)] transition-colors cursor-pointer"
      >
        <span>System Prompt</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
        />
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Enter a custom system prompt to shape AI responses..."
            maxLength={4000}
            rows={4}
            className="w-full bg-[var(--glass-bg)] border border-[var(--border-color)] rounded-lg p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-y outline-none focus:border-[var(--accent)]"
          />
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>{draft.length}/4000</span>
            {saved && <span className="text-[var(--accent)]">Saved</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className="flex-1 px-3 py-2 btn-gradient text-[var(--button-text)] rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              Save
            </button>
            <button
              onClick={handleClear}
              disabled={!draft && !systemPrompt}
              className="px-3 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:text-[var(--text-primary)] transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
