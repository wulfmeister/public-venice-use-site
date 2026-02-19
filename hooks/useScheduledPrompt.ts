"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ScheduledPromptSettings } from "@/lib/types";
import { scheduledPromptStorage } from "@/lib/storage";
import { CONSTANTS } from "@/lib/constants";
import { sendChatRequest } from "@/lib/chat-api";
import { parseStreamingResponse } from "@/lib/streaming";
import { useChat } from "@/contexts/ChatContext";
import { useApp } from "@/contexts/AppContext";

const DEFAULT_SETTINGS: ScheduledPromptSettings = {
  enabled: false,
  prompt: "",
  hour: 8,
  minute: 0,
  model: "",
  webSearch: "current",
  lastRunDate: "",
  lastRunTime: "",
  conversationId: "",
};

export function useScheduledPrompt() {
  const [settings, setSettings] =
    useState<ScheduledPromptSettings>(DEFAULT_SETTINGS);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRunningRef = useRef(false);
  const { addMessageToConversation, updateMessageInConversation } = useChat();
  const { selectedModel, webSearchEnabled, systemPrompt } = useApp();

  // Load settings from storage on mount
  useEffect(() => {
    const saved = scheduledPromptStorage.get();
    if (saved) {
      setSettings(saved);
    }
  }, []);

  const updateSettings = useCallback(
    (updates: Partial<ScheduledPromptSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...updates };
        // When enabling, ensure a stable conversationId exists to avoid race conditions
        if (updated.enabled && !updated.conversationId) {
          updated.conversationId = `scheduled-${Date.now()}`;
        }
        scheduledPromptStorage.set(updated);
        return updated;
      });
    },
    [],
  );

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window))
      return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  const showNotification = useCallback((title: string, body: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification(title, { body, icon: "/favicon.ico" });
    } catch {
      // Notifications not supported in this context
    }
  }, []);

  const runScheduledPrompt = useCallback(
    async (isTest = false) => {
      if (isRunningRef.current) return;
      if (!settings.prompt.trim()) return;

      isRunningRef.current = true;
      setIsRunning(true);

      try {
        const model =
          settings.model || selectedModel || CONSTANTS.DEFAULT_MODEL;
        let webSearch: boolean;
        if (settings.webSearch === "on") webSearch = true;
        else if (settings.webSearch === "off") webSearch = false;
        else webSearch = webSearchEnabled;

        // Use the stable conversation ID (guaranteed by updateSettings when enabling)
        const convId = settings.conversationId;
        const now = new Date();
        const dateStr = now.toLocaleDateString();

        // Add user message
        addMessageToConversation(
          convId,
          "user",
          settings.prompt,
        );

        // Add placeholder assistant message
        const assistantMsgId = addMessageToConversation(
          convId,
          "assistant",
          "Thinking...",
        );

        // Send the request
        const messages = [{ role: "user" as const, content: settings.prompt }];
        const response = await sendChatRequest({
          model,
          messages,
          webSearchEnabled: webSearch,
          systemPrompt: systemPrompt || undefined,
        });

        // Stream the response
        const result = await parseStreamingResponse(response, {
          onContent: (content) => {
            if (assistantMsgId) {
              updateMessageInConversation(convId, assistantMsgId, { content });
            }
          },
          onCitations: (citations) => {
            if (assistantMsgId) {
              updateMessageInConversation(convId, assistantMsgId, {
                citations,
              });
            }
          },
        });

        // Final update
        if (assistantMsgId) {
          updateMessageInConversation(convId, assistantMsgId, {
            content: result.content,
            citations:
              Object.keys(result.citations).length > 0
                ? result.citations
                : undefined,
          });
        }

        // Update last run info (skip date update for test runs)
        if (!isTest) {
          updateSettings({
            lastRunDate: dateStr,
            lastRunTime: now.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        } else {
          updateSettings({
            lastRunTime:
              now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) + " (test)",
          });
        }

        showNotification(
          isTest ? "Scheduled Prompt (Test)" : "Scheduled Prompt",
          result.content.substring(0, 100) +
            (result.content.length > 100 ? "..." : ""),
        );
      } catch (error) {
        console.error("Scheduled prompt failed:", error);
        showNotification("Scheduled Prompt Failed", String(error));
      } finally {
        isRunningRef.current = false;
        setIsRunning(false);
      }
    },
    [
      settings,
      selectedModel,
      webSearchEnabled,
      systemPrompt,
      addMessageToConversation,
      updateMessageInConversation,
      updateSettings,
      showNotification,
    ],
  );

  const checkSchedule = useCallback(() => {
    if (!settings.enabled || !settings.prompt.trim()) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayStr = now.toLocaleDateString();

    // Check if it's time to run and hasn't run today
    if (
      currentHour === settings.hour &&
      currentMinute >= settings.minute &&
      currentMinute < settings.minute + 2 &&
      settings.lastRunDate !== todayStr
    ) {
      void runScheduledPrompt(false);
    }
  }, [settings, runScheduledPrompt]);

  // Set up interval to check schedule
  useEffect(() => {
    if (settings.enabled) {
      // Check immediately
      checkSchedule();
      // Then check every 60 seconds
      intervalRef.current = setInterval(checkSchedule, 60000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [settings.enabled, checkSchedule]);

  const getNextRunTime = () => {
    if (!settings.enabled) return null;
    const now = new Date();
    const next = new Date();
    next.setHours(settings.hour, settings.minute, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next.toLocaleString([], {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return {
    settings,
    updateSettings,
    isRunning,
    runScheduledPrompt,
    requestPermission,
    getNextRunTime,
  };
}
