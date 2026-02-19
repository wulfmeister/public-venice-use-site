'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { appStorage } from '@/lib/storage';
import { CONSTANTS } from '@/lib/constants';
import { ModelCapabilities } from '@/lib/types';

interface AppContextType {
  tosAccepted: boolean;
  acceptTos: () => void;
  rateLimitRemaining: number;
  setRateLimitRemaining: (n: number) => void;
  isLoading: boolean;
  setIsLoading: (bool: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  webSearchEnabled: boolean;
  setWebSearchEnabled: (enabled: boolean) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  selectedImageModel: string;
  setSelectedImageModel: (model: string) => void;
  models: string[];
  setModels: (models: string[]) => void;
  imageModels: string[];
  setImageModels: (models: string[]) => void;
  modelCapabilities: Record<string, ModelCapabilities>;
  setModelCapabilities: (capabilities: Record<string, ModelCapabilities>) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Initialize with server-safe defaults to avoid hydration mismatches.
  // Actual localStorage values are loaded in a useEffect below.
  const [tosAccepted, setTosAccepted] = useState(false);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>(CONSTANTS.DEFAULT_MODEL);
  const [selectedImageModel, setSelectedImageModel] = useState<string>(CONSTANTS.DEFAULT_IMAGE_MODEL);
  const [models, setModels] = useState<string[]>([]);
  const [imageModels, setImageModels] = useState<string[]>([...CONSTANTS.IMAGE_MODELS]);
  const [modelCapabilities, setModelCapabilities] = useState<Record<string, ModelCapabilities>>({});
  const [systemPrompt, setSystemPrompt] = useState<string>('');

  // Hydrate from localStorage after mount (client-only)
  useEffect(() => {
    setTosAccepted(appStorage.getTosAccepted());
    // Default sidebar to collapsed on mobile if no stored preference
    const storedCollapsed = appStorage.getSidebarCollapsed();
    const hasStoredPref = localStorage.getItem('sidebarCollapsed') !== null;
    setSidebarCollapsed(hasStoredPref ? storedCollapsed : window.innerWidth < 1024);
    setWebSearchEnabled(appStorage.getWebSearchEnabled());
    setSelectedModel(appStorage.getSelectedModel());
    setSelectedImageModel(appStorage.getSelectedImageModel());
    setSystemPrompt(appStorage.getSystemPrompt());
  }, []);

  // Save to storage when values change (skip the initial hydration render)
  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    appStorage.setTosAccepted(tosAccepted);
    appStorage.setSidebarCollapsed(sidebarCollapsed);
    appStorage.setWebSearchEnabled(webSearchEnabled);
    appStorage.setSelectedModel(selectedModel);
    appStorage.setSelectedImageModel(selectedImageModel);
    appStorage.setSystemPrompt(systemPrompt);
  }, [tosAccepted, sidebarCollapsed, webSearchEnabled, selectedModel, selectedImageModel, systemPrompt]);

  const acceptTos = () => {
    setTosAccepted(true);
  };

  return (
    <AppContext.Provider value={{
      tosAccepted,
      acceptTos,
      rateLimitRemaining,
      setRateLimitRemaining,
      isLoading,
      setIsLoading,
      sidebarCollapsed,
      setSidebarCollapsed,
      webSearchEnabled,
      setWebSearchEnabled,
      selectedModel,
      setSelectedModel,
      selectedImageModel,
      setSelectedImageModel,
      models,
      setModels,
      imageModels,
      setImageModels,
      modelCapabilities,
      setModelCapabilities,
      systemPrompt,
      setSystemPrompt
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
