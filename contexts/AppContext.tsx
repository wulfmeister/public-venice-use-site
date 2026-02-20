'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { appStorage } from '@/lib/storage';
import { CONSTANTS } from '@/lib/constants';
import { ModelCapabilities } from '@/lib/types';

interface AppContextType {
  hydrated: boolean;
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
  passwordRequired: boolean | null;
  setPasswordRequired: (required: boolean) => void;
  passwordAccepted: boolean;
  setPasswordAccepted: (accepted: boolean) => void;
  deploymentPassword: string;
  submitPassword: (password: string) => Promise<boolean>;
  resetPassword: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Initialize with server-safe defaults to avoid hydration mismatches.
  // Actual localStorage values are loaded in a useEffect below.
  const [hydrated, setHydrated] = useState(false);
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
  const [passwordRequired, setPasswordRequired] = useState<boolean | null>(null);
  const [passwordAccepted, setPasswordAccepted] = useState(false);
  const [deploymentPassword, setDeploymentPassword] = useState('');

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
    // Optimistically restore cached deployment password
    const cachedPw = appStorage.getDeploymentPassword();
    if (cachedPw) {
      setDeploymentPassword(cachedPw);
      setPasswordAccepted(true);
    }
    setHydrated(true);
  }, []);

  // Save to storage when values change (skip the initial hydration render)
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
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

  const submitPassword = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TOS-Accepted': 'true',
          'X-Deployment-Password': password,
        },
        body: JSON.stringify({ model: '', messages: [{ role: 'user', content: 'ping' }] }),
      });
      if (res.status === 401) return false;
      // Any other status means password check passed
      setDeploymentPassword(password);
      setPasswordAccepted(true);
      appStorage.setDeploymentPassword(password);
      return true;
    } catch {
      return false;
    }
  };

  const resetPassword = () => {
    setDeploymentPassword('');
    setPasswordAccepted(false);
    appStorage.clearDeploymentPassword();
  };

  return (
    <AppContext.Provider value={{
      hydrated,
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
      setSystemPrompt,
      passwordRequired,
      setPasswordRequired,
      passwordAccepted,
      setPasswordAccepted,
      deploymentPassword,
      submitPassword,
      resetPassword
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
