"use client";

import type { ChangeEvent, FormEvent, KeyboardEvent, RefObject } from "react";
import QuickActions from "../QuickActions";
import { ImageAttachment } from "./input-types";
import { ImageIcon, Paperclip, ArrowUp, Sparkles, ZoomIn, Square } from "lucide-react";
import { CONSTANTS } from "@/lib/constants";

interface InputComposerProps {
  message: string;
  isLoading: boolean;
  tosAccepted: boolean;
  imageAttachment: ImageAttachment | null;
  upscaleScale: number;
  hasMessages: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  placeholder?: string;
  onMessageChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onKeyDown: (event: KeyboardEvent) => void;
  onImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onImageClick: () => void;
  onFileClick: () => void;
  onUpscaleScaleChange: (value: number) => void;
  onUpscaleImage: () => void;
  onGenerateImage: () => void;
  onStopGenerating?: () => void;
}

export default function InputComposer({
  message,
  isLoading,
  tosAccepted,
  imageAttachment,
  upscaleScale,
  hasMessages,
  textareaRef,
  fileInputRef,
  imageInputRef,
  placeholder,
  onMessageChange,
  onSubmit,
  onKeyDown,
  onImageSelect,
  onFileSelect,
  onImageClick,
  onFileClick,
  onUpscaleScaleChange,
  onUpscaleImage,
  onGenerateImage,
  onStopGenerating,
}: InputComposerProps) {
  return (
    <>
      {hasMessages && (
        <div className="mb-3">
          <QuickActions variant="inline" />
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-2xl px-3 py-2.5 transition-all duration-200 input-focus-glow"
      >
        {/* Left cluster — utility buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="relative flex flex-col items-center group">
            <button
              type="button"
              onClick={onImageClick}
              disabled={!tosAccepted || isLoading}
              className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] w-10 h-10 rounded-xl cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-[var(--border-color)] hover:text-[var(--text-primary)] hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Upload image"
            >
              <ImageIcon className="w-4.5 h-4.5" />
            </button>
            <span className="hidden md:block text-[10px] text-[var(--text-secondary)] mt-0.5 leading-none">Image</span>
          </div>

          <div className="relative flex flex-col items-center group">
            <button
              type="button"
              onClick={onFileClick}
              disabled={!tosAccepted || isLoading}
              className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] w-10 h-10 rounded-xl cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-[var(--border-color)] hover:text-[var(--text-primary)] hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Attach file"
            >
              <Paperclip className="w-4.5 h-4.5" />
            </button>
            <span className="hidden md:block text-[10px] text-[var(--text-secondary)] mt-0.5 leading-none">File</span>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder || "Type your message..."}
          rows={1}
          disabled={!tosAccepted || isLoading}
          className="flex-1 bg-transparent border-none text-[var(--text-primary)] text-base px-2 resize-none min-h-6 max-h-50 font-inherit outline-none"
        />

        {/* Right cluster — accent action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {imageAttachment && (
            <div className="flex items-center gap-1.5 animate-slide-down">
              <select
                value={upscaleScale}
                onChange={(e) => onUpscaleScaleChange(Number(e.target.value))}
                disabled={!tosAccepted || isLoading}
                className="bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] text-[var(--text-primary)] px-2 py-2 rounded-lg text-xs cursor-pointer transition-all duration-200 shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Upscale factor"
              >
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
              <div className="relative flex flex-col items-center group">
                <button
                  type="button"
                  onClick={onUpscaleImage}
                  disabled={!tosAccepted || isLoading}
                  className="btn-gradient border-none text-[var(--button-text)] w-10 h-10 rounded-xl cursor-pointer flex items-center justify-center transition-all duration-100 hover:translate-y-[-1px] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Upscale image"
                >
                  <ZoomIn className="w-4.5 h-4.5" />
                </button>
                <span className="hidden md:block text-[10px] text-[var(--text-secondary)] mt-0.5 leading-none">Upscale</span>
              </div>
            </div>
          )}

          <div className="relative flex flex-col items-center group">
            <button
              type="button"
              onClick={onGenerateImage}
              disabled={
                !message.trim() ||
                !tosAccepted ||
                isLoading ||
                Boolean(imageAttachment)
              }
              className="btn-gradient border-none text-[var(--button-text)] w-10 h-10 rounded-xl cursor-pointer flex items-center justify-center transition-all duration-100 hover:translate-y-[-1px] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Generate image"
            >
              <Sparkles className="w-4.5 h-4.5" />
            </button>
            <span className="hidden md:block text-[10px] text-[var(--text-secondary)] mt-0.5 leading-none">Create</span>
          </div>

          {isLoading && onStopGenerating ? (
            <div className="relative flex flex-col items-center group">
              <button
                type="button"
                onClick={onStopGenerating}
                className="bg-red-500/10 border border-red-500/30 text-red-500 w-12 h-12 rounded-2xl cursor-pointer flex items-center justify-center transition-all duration-100 hover:bg-red-500/20 hover:translate-y-[-1px] shadow-md"
                aria-label="Stop generating"
              >
                <Square className="w-4 h-4" />
              </button>
              <span className="hidden md:block text-[10px] text-red-400 mt-0.5 leading-none">Stop</span>
            </div>
          ) : (
            <div className="relative flex flex-col items-center group">
              <button
                type="submit"
                disabled={
                  (!message.trim() && !imageAttachment) || !tosAccepted || isLoading
                }
                className="btn-gradient border-none text-[var(--button-text)] w-12 h-12 rounded-2xl cursor-pointer flex items-center justify-center transition-all duration-100 hover:translate-y-[-1px] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                aria-label="Send"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
              <span className="hidden md:block text-[10px] text-[var(--text-secondary)] mt-0.5 leading-none">Send</span>
            </div>
          )}
        </div>
      </form>

      <input
        ref={fileInputRef}
        type="file"
        accept={CONSTANTS.SUPPORTED_FILE_EXTENSIONS.join(',')}
        multiple
        onChange={onFileSelect}
        className="hidden"
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onImageSelect}
        className="hidden"
      />
    </>
  );
}
