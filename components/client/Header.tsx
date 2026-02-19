"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useApp } from "@/contexts/AppContext";
import { CONSTANTS } from "@/lib/constants";
import { Sun, Moon, ChevronDown, Globe, Eye, Cpu, Settings } from "lucide-react";

export default function Header() {
  const { theme, toggle } = useTheme();
  const {
    selectedModel,
    setSelectedModel,
    selectedImageModel,
    setSelectedImageModel,
    rateLimitRemaining,
    webSearchEnabled,
    setWebSearchEnabled,
    sidebarCollapsed,
    models,
    setModels,
    imageModels,
    setImageModels,
    modelCapabilities,
    setModelCapabilities,
  } = useApp();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch models on mount (runs once via hasFetched guard)
  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchModels = async () => {
      try {
        const response = await fetch("/api/info");
        if (response.ok) {
          const data = await response.json();
          const availableModels = data.models || [];
          const availableImageModels =
            data.image_models || CONSTANTS.IMAGE_MODELS;
          setModels(availableModels);
          setImageModels(availableImageModels);
          setModelCapabilities(data.model_capabilities || {});
          if (
            availableModels.length > 0 &&
            !availableModels.includes(selectedModel)
          ) {
            const preferredModel = availableModels.includes(
              CONSTANTS.DEFAULT_MODEL,
            )
              ? CONSTANTS.DEFAULT_MODEL
              : availableModels[0];
            setSelectedModel(preferredModel);
          }
          if (
            availableImageModels.length > 0 &&
            !availableImageModels.includes(selectedImageModel)
          ) {
            const preferredImageModel = availableImageModels.includes(
              CONSTANTS.DEFAULT_IMAGE_MODEL,
            )
              ? CONSTANTS.DEFAULT_IMAGE_MODEL
              : availableImageModels[0];
            setSelectedImageModel(preferredImageModel);
          }
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
      }
    };
    fetchModels();
  }, [selectedModel, selectedImageModel, setModels, setImageModels, setModelCapabilities, setSelectedModel, setSelectedImageModel]);

  useEffect(() => {
    if (models.length > 0 && !models.includes(selectedModel)) {
      const preferredModel = models.includes(CONSTANTS.DEFAULT_MODEL)
        ? CONSTANTS.DEFAULT_MODEL
        : models[0];
      setSelectedModel(preferredModel);
    }
  }, [models, selectedModel, setSelectedModel]);

  useEffect(() => {
    if (imageModels.length > 0 && !imageModels.includes(selectedImageModel)) {
      const preferredImageModel = imageModels.includes(
        CONSTANTS.DEFAULT_IMAGE_MODEL,
      )
        ? CONSTANTS.DEFAULT_IMAGE_MODEL
        : imageModels[0];
      setSelectedImageModel(preferredImageModel);
    }
  }, [imageModels, selectedImageModel, setSelectedImageModel]);

  // Update web search toggle based on selected model
  useEffect(() => {
    const capabilities = modelCapabilities[selectedModel];
    if (capabilities?.supportsWebSearch === false) {
      setWebSearchEnabled(false);
    }
  }, [selectedModel, modelCapabilities, setWebSearchEnabled]);

  const formatModelName = (modelId: string) => {
    return modelId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getCapabilityBadges = (modelId: string) => {
    const caps = modelCapabilities[modelId];
    if (!caps) return null;
    return (
      <span className="flex items-center gap-1 ml-auto">
        {caps.supportsVision && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--shadow-light)] text-[var(--accent)]" title="Vision">
            <Eye className="w-3 h-3 inline" />
          </span>
        )}
        {caps.supportsWebSearch && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--shadow-light)] text-[var(--accent)]" title="Web Search">
            <Globe className="w-3 h-3 inline" />
          </span>
        )}
      </span>
    );
  };

  return (
    <header
      className={`sticky top-0 z-50 bg-[var(--glass-bg)] backdrop-blur-[16px] py-3 px-4 md:px-6 flex items-center justify-between gap-3 border-b-2 border-[var(--glass-border)] transition-all duration-300 ${
        sidebarCollapsed ? "" : "md:pl-[calc(1.5rem+17.5rem)]"
      }`}
    >
      {/* Left: Logo */}
      <h1 className="font-ui text-xl font-semibold tracking-tight leading-none flex-shrink-0">
        <span className="inline-flex flex-col items-start gap-0.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[var(--text-primary)] shadow-[0_6px_16px_rgba(0,0,0,0.25)] ring-1 ring-white/10">
          <span className="font-bold">🌊 OpenChat</span>
          <span className="text-[10px] text-[var(--text-secondary)] font-normal">
            powered by Venice
          </span>
        </span>
      </h1>

      {/* Center: Model pill + dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--shadow-light)] transition-all cursor-pointer"
          aria-label="Select model"
        >
          <Cpu className="w-4 h-4 text-[var(--accent)]" />
          <span className="max-w-[10rem] truncate">{formatModelName(selectedModel)}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />

          {/* Rate limit indicator inline */}
          <span className={`ml-1 text-xs font-semibold ${
            rateLimitRemaining === 0 ? 'text-red-500 animate-pulse' :
            rateLimitRemaining <= 5 ? 'text-red-500' :
            rateLimitRemaining <= 15 ? 'text-amber-500' :
            'text-emerald-500'
          }`}>
            {rateLimitRemaining === 0 ? '!' : rateLimitRemaining}
          </span>
        </button>

        {/* Custom dropdown panel */}
        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-72 max-h-96 overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl shadow-2xl z-50 animate-slide-down">
            {/* Text Models */}
            <div className="px-3 pt-3 pb-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Text Models</div>
            </div>
            <div className="px-1 pb-2">
              {models.map((model) => (
                <button
                  key={model}
                  type="button"
                  onClick={() => { setSelectedModel(model); setDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                    model === selectedModel
                      ? 'bg-[var(--shadow-light)] text-[var(--accent)] font-medium'
                      : 'text-[var(--text-primary)] hover:bg-[var(--shadow-light)]'
                  }`}
                >
                  <span className="truncate flex-1">{formatModelName(model)}</span>
                  {getCapabilityBadges(model)}
                </button>
              ))}
            </div>

            {/* Image Models */}
            <div className="border-t border-[var(--border-color)]">
              <div className="px-3 pt-3 pb-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Image Models</div>
              </div>
              <div className="px-1 pb-2">
                {imageModels.map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => { setSelectedImageModel(model); setDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                      model === selectedImageModel
                        ? 'bg-[var(--shadow-light)] text-[var(--accent)] font-medium'
                        : 'text-[var(--text-primary)] hover:bg-[var(--shadow-light)]'
                    }`}
                  >
                    <span className="truncate flex-1">{formatModelName(model)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Web Search Toggle — inside dropdown */}
            <div className="border-t border-[var(--border-color)] px-3 py-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                  <Globe className="w-4 h-4 text-[var(--accent)]" />
                  Web Search
                </span>
                <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                  webSearchEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
                } ${!modelCapabilities[selectedModel]?.supportsWebSearch ? 'opacity-40' : ''}`}>
                  <input
                    type="checkbox"
                    checked={webSearchEnabled}
                    onChange={(e) => setWebSearchEnabled(e.target.checked)}
                    disabled={!modelCapabilities[selectedModel]?.supportsWebSearch}
                    className="opacity-0 w-0 h-0"
                  />
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full transition-transform duration-200 ${
                      webSearchEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Rate Limit Bar */}
            <div className="border-t border-[var(--border-color)] px-3 py-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
                <span>Requests</span>
                {rateLimitRemaining === 0 ? (
                  <span className="text-red-500 font-semibold">Rate limited</span>
                ) : (
                  <span>
                    <strong className={
                      rateLimitRemaining <= 5 ? 'text-red-500' :
                      rateLimitRemaining <= 15 ? 'text-amber-500' :
                      'text-emerald-500'
                    }>{rateLimitRemaining}</strong>/20
                  </span>
                )}
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    rateLimitRemaining === 0 ? 'bg-red-500' :
                    rateLimitRemaining <= 5 ? 'bg-red-500' :
                    rateLimitRemaining <= 15 ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`}
                  style={{ width: `${(rateLimitRemaining / 20) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Settings gear + Theme toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Settings popover with Terms link */}
        <div ref={settingsRef} className="relative">
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--shadow-light)] transition-colors cursor-pointer"
            aria-label="Settings"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
          {settingsOpen && (
            <div className="absolute top-full right-0 mt-2 w-40 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl shadow-2xl z-50 animate-slide-down py-1">
              <a
                href="/tos.html"
                className="block px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--shadow-light)] transition-colors"
              >
                Terms of Service
              </a>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggle}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--shadow-light)] transition-colors cursor-pointer"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Moon className="w-4.5 h-4.5" />
          ) : (
            <Sun className="w-4.5 h-4.5" />
          )}
        </button>
      </div>
    </header>
  );
}
