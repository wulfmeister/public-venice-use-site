'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { Message as MessageType } from '@/lib/types';
import { escapeHtml, formatMessage } from '@/lib/markdown';
import { isValidUrl } from '@/lib/validation';
import { getImageBlob } from '@/lib/image-store';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import { Bot, User, Copy, Check, RefreshCw, Square } from 'lucide-react';

interface MessageProps {
  message: MessageType;
  isLast?: boolean;
}

export default function Message({ message, isLast }: MessageProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(message.imageDataUrl || null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    const loadImage = async () => {
      if (message.imageId) {
        try {
          const blob = await getImageBlob(message.imageId);
          if (blob) {
            objectUrl = URL.createObjectURL(blob);
            setImageSrc(objectUrl);
            return;
          }
        } catch (error) {
          console.error('Failed to load image from IndexedDB:', error);
        }
      }

      setImageSrc(message.imageDataUrl || null);
    };

    loadImage();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [message.imageId, message.imageDataUrl]);

  const addCitationsSection = useCallback((contentDiv: HTMLElement) => {
    if (!message.citations || Object.keys(message.citations).length === 0) return;

    // Create citations section
    const citationsSection = document.createElement('details');
    citationsSection.className = 'citations-section mt-4 p-4 bg-[var(--bg-tertiary)] rounded-lg border-l-4 border-[var(--border-color)] transition-all duration-300';

    const titleEl = document.createElement('summary');
    titleEl.className = 'citations-title text-sm font-semibold text-[var(--text-secondary)] cursor-pointer list-none flex items-center gap-2';
    titleEl.innerHTML = '<span class="text-[var(--text-secondary)]">▸</span><span>Sources</span>';
    citationsSection.appendChild(titleEl);

    // Sort citation keys numerically
    const sortedKeys = Object.keys(message.citations)
      .map(k => parseInt(k))
      .filter(k => !isNaN(k))
      .sort((a, b) => a - b);

    const listContainer = document.createElement('div');
    listContainer.className = 'mt-3';

    citationsSection.addEventListener('toggle', () => {
      const caret = titleEl.querySelector('span');
      if (caret) {
        caret.textContent = citationsSection.open ? '▾' : '▸';
      }
    });

    sortedKeys.forEach((key) => {
      const doc = message.citations?.[key];
      const displayNum = key + 1;

      if (!doc) return;

      // Get URL from various possible locations
      const href = doc.url || (doc.metadata?.url as string | undefined);
      const hasValidUrl = href && isValidUrl(href);
      const title = doc.title || (doc.metadata?.title as string | undefined) || `Source ${displayNum}`;

      const citationItem = document.createElement('div');
      citationItem.className = 'citation-item mb-3 text-sm p-3 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] transition-all duration-200 hover:bg-[var(--shadow-light)]';

      const citationLink = document.createElement('a');
      citationLink.href = hasValidUrl ? href : '#';
      citationLink.className = 'citation-source-link font-medium text-[var(--accent)] hover:text-[var(--accent-light)] break-all block leading-relaxed';
      citationLink.setAttribute('data-citation-index', key.toString());
      citationLink.setAttribute('data-citation-num', displayNum.toString());

      if (hasValidUrl) {
        citationLink.target = '_blank';
        citationLink.rel = 'noopener noreferrer';
      }

      citationLink.innerHTML = `<strong>[${displayNum}]</strong> ${escapeHtml(title)}`;

      // Add snippet if available
      if (doc.snippet) {
        const snippet = document.createElement('div');
        snippet.className = 'citation-snippet text-xs text-[var(--text-secondary)] mt-1 leading-relaxed italic';
        snippet.textContent = doc.snippet.length > 150
          ? doc.snippet.substring(0, 150) + '...'
          : doc.snippet;
        citationItem.appendChild(citationLink);
        citationItem.appendChild(snippet);
      } else {
        citationItem.appendChild(citationLink);
      }

      // Show URL below title if available
      if (hasValidUrl) {
        const urlDisplay = document.createElement('div');
        urlDisplay.className = 'citation-url text-xs text-[var(--text-secondary)] opacity-70 mt-1 break-all';
        urlDisplay.textContent = href.length > 60 ? href.substring(0, 60) + '...' : href;
        citationItem.appendChild(urlDisplay);
      }

      listContainer.appendChild(citationItem);
    });

    citationsSection.appendChild(listContainer);

    // Append to contentDiv
    contentDiv.appendChild(citationsSection);
  }, [message.citations]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const rawHtml = formatMessage(message.content, message.citations);
    container.innerHTML = DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: ['target', 'rel', 'data-citation', 'data-citation-num'],
      ADD_TAGS: ['sup'],
    });

    // Syntax highlighting
    Prism.highlightAllUnder(container);

    // Add "Copy code" button to each code block
    const copyBtnTimeouts: ReturnType<typeof setTimeout>[] = [];
    container.querySelectorAll<HTMLPreElement>('pre.md-codeblock').forEach((pre) => {
      if (pre.querySelector('.copy-code-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'copy-code-btn';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code');
      btn.addEventListener('click', () => {
        const code = pre.querySelector('code');
        if (code) {
          navigator.clipboard.writeText(code.textContent || '').then(() => {
            btn.textContent = 'Copied!';
            const t = setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
            copyBtnTimeouts.push(t);
          });
        }
      });
      pre.style.position = 'relative';
      pre.appendChild(btn);
    });

    addCitationsSection(container);

    // Cleanup: remove injected DOM nodes and clear timeouts
    return () => {
      copyBtnTimeouts.forEach((t) => clearTimeout(t));
      container.querySelectorAll('.copy-code-btn').forEach((btn) => btn.remove());
      container.querySelectorAll('.citations-section').forEach((el) => el.remove());
    };
  }, [addCitationsSection, message.content, message.citations]);

  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const handleRegenerate = () => {
    window.dispatchEvent(new CustomEvent('regenerateLastAssistant'));
  };

  const handleStop = () => {
    window.dispatchEvent(new CustomEvent('stopGenerating'));
  };

  const isThinking = message.role === 'assistant' && message.content.trim() === 'Thinking...';
  const isGenerating = message.role === 'assistant' && message.content.trim() === 'Generating image...';

  if (message.role === 'user') {
    return (
      <div className="flex justify-end gap-3 animate-message-in py-4">
        <div className="message-content px-5 py-3 rounded-2xl max-w-2xl text-sm leading-relaxed font-medium bg-[var(--user-bubble-bg)] text-[var(--user-bubble-text)]">
          {imageSrc && (
            <img
              src={imageSrc}
              alt={message.imageName || 'Uploaded image'}
              className="w-full max-w-sm rounded-lg border border-white/20 object-cover"
            />
          )}
          <div
            ref={contentRef}
            className={`${imageSrc ? 'mt-3' : ''}`}
          />
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--user-bubble-bg)] text-[var(--user-bubble-text)]">
          <User className="w-4 h-4" />
        </div>
      </div>
    );
  }

  const showActions = !isThinking && !isGenerating;

  return (
    <div className="group/msg animate-message-in border-t border-[var(--assistant-border-top)] py-5 px-2">
      <div className="flex gap-3 items-start">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--shadow-light)] text-[var(--accent)]">
          <Bot className="w-4 h-4" />
        </div>
        <div className="message-content flex-1 min-w-0 text-sm leading-relaxed">
          {isThinking ? (
            <>
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 space-y-2">
                  <div className="skeleton-bar h-3 rounded-md w-4/5" />
                  <div className="skeleton-bar h-3 rounded-md w-3/5" />
                  <div className="skeleton-bar h-3 rounded-md w-2/5" />
                </div>
              </div>
              <button
                type="button"
                onClick={handleStop}
                className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer"
                aria-label="Stop generating"
              >
                <Square className="w-3 h-3" />
                Stop
              </button>
            </>
          ) : (
            <>
              {imageSrc && (
                <img
                  src={imageSrc}
                  alt={message.imageName || 'Uploaded image'}
                  className="w-full max-w-sm rounded-lg border border-[var(--border-color)] object-cover"
                />
              )}
              <div
                ref={contentRef}
                className={`${imageSrc ? 'mt-3' : ''}`}
              />
            </>
          )}
          {showActions && (
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--shadow-light)] transition-colors cursor-pointer"
                aria-label="Copy message"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              {isLast && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--shadow-light)] transition-colors cursor-pointer"
                  aria-label="Regenerate response"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
