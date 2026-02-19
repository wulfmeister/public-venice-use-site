'use client';

import { useState, useEffect } from 'react';
import { useScheduledPrompt } from '@/hooks/useScheduledPrompt';
import { useApp } from '@/contexts/AppContext';
import { scheduledPromptStorage } from '@/lib/storage';
import { ChevronDown } from 'lucide-react';

export default function ScheduledPrompt() {
  const {
    settings,
    updateSettings,
    isRunning,
    runScheduledPrompt,
    requestPermission,
    getNextRunTime
  } = useScheduledPrompt();
  const { models } = useApp();

  const [collapsed, setCollapsed] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Load collapsed state and notification permission
  useEffect(() => {
    setCollapsed(scheduledPromptStorage.isCollapsed());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    scheduledPromptStorage.setCollapsed(next);
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    setNotificationPermission(granted ? 'granted' : 'denied');
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  return (
    <div className="border-b border-[var(--border-color)]">
      <button
        onClick={toggleCollapsed}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--shadow-light)] transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          Scheduled Prompt
          {settings.enabled && (
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] inline-block" />
          )}
        </span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
        />
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {/* Enable toggle */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs text-[var(--text-secondary)]">Enable</span>
            <button
              role="switch"
              aria-checked={settings.enabled}
              onClick={() => updateSettings({ enabled: !settings.enabled })}
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                settings.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--text-secondary)] opacity-40'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.enabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </label>

          {/* Prompt textarea */}
          <textarea
            value={settings.prompt}
            onChange={(e) => updateSettings({ prompt: e.target.value })}
            placeholder="Enter the prompt to run on schedule..."
            rows={3}
            className="w-full bg-[var(--glass-bg)] border border-[var(--border-color)] rounded-lg p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-y outline-none focus:border-[var(--accent)]"
          />

          {/* Time picker */}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-[var(--text-secondary)] w-10">Time</span>
            <select
              value={settings.hour}
              onChange={(e) => updateSettings({ hour: Number(e.target.value) })}
              className="flex-1 bg-[var(--glass-bg)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none"
            >
              {hours.map(h => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}
                </option>
              ))}
            </select>
            <span className="text-[var(--text-secondary)]">:</span>
            <select
              value={settings.minute}
              onChange={(e) => updateSettings({ minute: Number(e.target.value) })}
              className="flex-1 bg-[var(--glass-bg)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none"
            >
              {minutes.map(m => (
                <option key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>

          {/* Model override */}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-[var(--text-secondary)] w-10">Model</span>
            <select
              value={settings.model}
              onChange={(e) => updateSettings({ model: e.target.value })}
              className="flex-1 bg-[var(--glass-bg)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="">Use current model</option>
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Web search override */}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-[var(--text-secondary)] w-10">Web</span>
            <select
              value={settings.webSearch}
              onChange={(e) => updateSettings({ webSearch: e.target.value as 'current' | 'on' | 'off' })}
              className="flex-1 bg-[var(--glass-bg)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="current">Use current setting</option>
              <option value="on">Always on</option>
              <option value="off">Always off</option>
            </select>
          </div>

          {/* Notification permission banner */}
          {notificationPermission === 'default' && (
            <button
              onClick={handleRequestPermission}
              className="w-full px-3 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-600 rounded-lg text-xs cursor-pointer hover:bg-blue-500/20 transition-colors"
            >
              Enable notifications for scheduled results
            </button>
          )}

          {/* Test button */}
          <button
            onClick={() => { runScheduledPrompt(true).catch((err) => console.error('Scheduled prompt failed:', err)); }}
            disabled={isRunning || !settings.prompt.trim()}
            className="w-full px-3 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:text-[var(--text-primary)] hover:bg-[var(--shadow-light)] transition-colors"
          >
            {isRunning ? 'Running...' : 'Test Now'}
          </button>

          {/* Status display */}
          <div className="text-xs text-[var(--text-secondary)] space-y-1">
            {settings.enabled && (
              <div>Next: {getNextRunTime() || 'Not scheduled'}</div>
            )}
            {settings.lastRunTime && (
              <div>Last run: {settings.lastRunTime}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
