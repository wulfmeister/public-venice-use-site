"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useApp } from "@/contexts/AppContext";
import { CONSTANTS } from "@/lib/constants";
import { Sun, Moon, ChevronDown, Globe, Eye, Cpu, Settings, ImageIcon } from "lucide-react";

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
    setPasswordRequired,
    setPasswordAccepted,
  } = useApp();

  const [textDropdownOpen, setTextDropdownOpen] = useState(false);
  const [imageDropdownOpen, setImageDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const textDropdownRef = useRef<HTMLDivElement>(null);
  const imageDropdownRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (textDropdownRef.current && !textDropdownRef.current.contains(e.target as Node)) {
        setTextDropdownOpen(false);
      }
      if (imageDropdownRef.current && !imageDropdownRef.current.contains(e.target as Node)) {
        setImageDropdownOpen(false);
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
          if (data.password_required !== undefined) {
            setPasswordRequired(data.password_required);
            if (!data.password_required) {
              setPasswordAccepted(true);
            }
          }
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
  }, [selectedModel, selectedImageModel, setModels, setImageModels, setModelCapabilities, setSelectedModel, setSelectedImageModel, setPasswordRequired, setPasswordAccepted]);

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
      className={`sticky top-0 z-50 bg-[var(--glass-bg)] backdrop-blur-[16px] py-2.5 px-4 md:px-6 flex items-center gap-3 border-b-2 border-[var(--glass-border)] transition-all duration-300 ${
        sidebarCollapsed ? "" : "md:pl-[calc(1.5rem+17.5rem)]"
      }`}
    >
      {/* Left: Logo */}
      <h1 className="font-ui text-lg font-semibold tracking-tight leading-none flex-shrink-0 mr-auto">
        <span className="font-bold text-[var(--text-primary)]">🌊 OpenChat</span>
      </h1>

      {/* Center: Model selectors */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Text Model selector */}
        <div ref={textDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => { setTextDropdownOpen(!textDropdownOpen); setImageDropdownOpen(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--shadow-light)] transition-all cursor-pointer"
            aria-label="Select text model"
          >
            <Cpu className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
            <span className="max-w-[8rem] truncate hidden lg:inline">{formatModelName(selectedModel)}</span>
            <ChevronDown className={`w-3 h-3 text-[var(--text-secondary)] transition-transform duration-200 ${textDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {textDropdownOpen && (
            <div className="fixed inset-x-4 top-14 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:w-72 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl shadow-2xl z-50 animate-slide-down">
              <div className="px-3 pt-3 pb-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Text Models</div>
              </div>
              <div className="px-1 pb-2">
                {models.map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => { setSelectedModel(model); setTextDropdownOpen(false); }}
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

              {/* Web Search Toggle */}
              <div className="border-t border-[var(--border-color)] px-3 py-2.5">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                    <Globe className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Web Search
                  </span>
                  <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
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
                        webSearchEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Image Model selector */}
        <div ref={imageDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => { setImageDropdownOpen(!imageDropdownOpen); setTextDropdownOpen(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--shadow-light)] transition-all cursor-pointer"
            aria-label="Select image model"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
            <span className="max-w-[8rem] truncate hidden lg:inline">{formatModelName(selectedImageModel)}</span>
            <ChevronDown className={`w-3 h-3 text-[var(--text-secondary)] transition-transform duration-200 ${imageDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {imageDropdownOpen && (
            <div className="fixed inset-x-4 top-14 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:w-56 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl shadow-2xl z-50 animate-slide-down">
              <div className="px-3 pt-3 pb-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Image Models</div>
              </div>
              <div className="px-1 pb-2">
                {imageModels.map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => { setSelectedImageModel(model); setImageDropdownOpen(false); }}
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
          )}
        </div>

        {/* Rate limit indicator */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
            rateLimitRemaining === 0 ? 'text-red-500 bg-red-500/10 animate-pulse' :
            rateLimitRemaining <= 5 ? 'text-red-500 bg-red-500/10' :
            rateLimitRemaining <= 15 ? 'text-amber-500 bg-amber-500/10' :
            'text-emerald-500 bg-emerald-500/10'
          }`}>
            {rateLimitRemaining === 0 ? 'Rate limited' : rateLimitRemaining}
          </span>
          <div className="w-full h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                rateLimitRemaining === 0 ? 'bg-red-500 animate-pulse' :
                rateLimitRemaining <= 5 ? 'bg-red-500' :
                rateLimitRemaining <= 15 ? 'bg-amber-500' :
                'bg-emerald-500'
              }`}
              style={{ width: `${(rateLimitRemaining / CONSTANTS.RATE_LIMIT) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Right: Settings gear + Theme toggle */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <div ref={settingsRef} className="relative">
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--shadow-light)] transition-colors cursor-pointer"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
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

        <button
          type="button"
          onClick={toggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--shadow-light)] transition-colors cursor-pointer"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
}
