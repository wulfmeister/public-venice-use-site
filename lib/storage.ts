import { Conversation, ScheduledPromptSettings } from "./types";
import { CONSTANTS } from "./constants";

// Storage keys
const STORAGE_KEYS = {
  CONVERSATIONS: "conversations",
  CURRENT_CONVERSATION_ID: "currentConversationId",
  TOS_ACCEPTED: "tosAccepted",
  THEME: "theme",
  SIDEBAR_COLLAPSED: "sidebarCollapsed",
  WEB_SEARCH_ENABLED: "webSearchEnabled",
  SELECTED_MODEL: "selectedModel",
  SELECTED_IMAGE_MODEL: "selectedImageModel",
  SYSTEM_PROMPT: "customSystemPrompt",
  SCHEDULED_PROMPT: "scheduledPrompt",
  SCHEDULED_SECTION_COLLAPSED: "scheduledSectionCollapsed",
  DEPLOYMENT_PASSWORD: "deploymentPassword",
} as const;

// Generic storage utilities
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | undefined => {
    if (typeof window === "undefined") return defaultValue;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
    }
  },

  remove: (key: string): void => {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  },

  clear: (): void => {
    if (typeof window === "undefined") return;

    try {
      localStorage.clear();
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  },
};

// Conversation storage
export const conversationsStorage = {
  get: (): Record<string, Conversation> => {
    return storage.get(STORAGE_KEYS.CONVERSATIONS, {}) || {};
  },

  set: (conversations: Record<string, Conversation>): void => {
    storage.set(STORAGE_KEYS.CONVERSATIONS, conversations);
  },

  getCurrentId: (): string | null => {
    return storage.get<string>(STORAGE_KEYS.CURRENT_CONVERSATION_ID) ?? null;
  },

  setCurrentId: (id: string | null): void => {
    if (id) {
      storage.set(STORAGE_KEYS.CURRENT_CONVERSATION_ID, id);
    } else {
      storage.remove(STORAGE_KEYS.CURRENT_CONVERSATION_ID);
    }
  },
};

export const appStorage = {
  getTosAccepted: (): boolean =>
    storage.get(STORAGE_KEYS.TOS_ACCEPTED, false) ?? false,
  setTosAccepted: (accepted: boolean): void =>
    storage.set(STORAGE_KEYS.TOS_ACCEPTED, accepted),

  getTheme: (): "light" | "dark" => {
    const stored = storage.get<string>(STORAGE_KEYS.THEME, "light");
    if (stored === "dark" || stored === "light") return stored;
    // Corrupted value — reset to default
    storage.set(STORAGE_KEYS.THEME, "light");
    return "light";
  },
  setTheme: (theme: "light" | "dark"): void =>
    storage.set(STORAGE_KEYS.THEME, theme),

  getSidebarCollapsed: (): boolean =>
    storage.get(STORAGE_KEYS.SIDEBAR_COLLAPSED, false) ?? false,
  setSidebarCollapsed: (collapsed: boolean): void =>
    storage.set(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed),

  getWebSearchEnabled: (): boolean =>
    storage.get(STORAGE_KEYS.WEB_SEARCH_ENABLED, true) ?? true,
  setWebSearchEnabled: (enabled: boolean): void =>
    storage.set(STORAGE_KEYS.WEB_SEARCH_ENABLED, enabled),

  getSelectedModel: (): string =>
    storage.get(STORAGE_KEYS.SELECTED_MODEL, CONSTANTS.DEFAULT_MODEL) ??
    CONSTANTS.DEFAULT_MODEL,
  setSelectedModel: (model: string): void =>
    storage.set(STORAGE_KEYS.SELECTED_MODEL, model),

  getSelectedImageModel: (): string =>
    storage.get(
      STORAGE_KEYS.SELECTED_IMAGE_MODEL,
      CONSTANTS.DEFAULT_IMAGE_MODEL,
    ) ?? CONSTANTS.DEFAULT_IMAGE_MODEL,
  setSelectedImageModel: (model: string): void =>
    storage.set(STORAGE_KEYS.SELECTED_IMAGE_MODEL, model),

  getSystemPrompt: (): string =>
    storage.get(STORAGE_KEYS.SYSTEM_PROMPT, "") ?? "",
  setSystemPrompt: (prompt: string): void =>
    storage.set(STORAGE_KEYS.SYSTEM_PROMPT, prompt),

  getDeploymentPassword: (): string =>
    storage.get(STORAGE_KEYS.DEPLOYMENT_PASSWORD, "") ?? "",
  setDeploymentPassword: (pw: string): void =>
    storage.set(STORAGE_KEYS.DEPLOYMENT_PASSWORD, pw),
  clearDeploymentPassword: (): void =>
    storage.remove(STORAGE_KEYS.DEPLOYMENT_PASSWORD),
};

export const scheduledPromptStorage = {
  get: (): ScheduledPromptSettings | null => {
    return (
      storage.get<ScheduledPromptSettings>(
        STORAGE_KEYS.SCHEDULED_PROMPT,
        undefined,
      ) || null
    );
  },

  set: (settings: ScheduledPromptSettings): void => {
    storage.set(STORAGE_KEYS.SCHEDULED_PROMPT, settings);
  },

  isCollapsed: (): boolean => {
    if (typeof window === "undefined") return true;
    try {
      const item = localStorage.getItem(
        STORAGE_KEYS.SCHEDULED_SECTION_COLLAPSED,
      );
      return item ? JSON.parse(item) : true;
    } catch {
      return true;
    }
  },

  setCollapsed: (collapsed: boolean): void => {
    storage.set(STORAGE_KEYS.SCHEDULED_SECTION_COLLAPSED, collapsed);
  },
};
