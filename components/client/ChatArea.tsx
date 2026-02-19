'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useApp } from '@/contexts/AppContext';
import Message from './Message';
import WelcomeMessage from './WelcomeMessage';
import { ChevronDown } from 'lucide-react';

export default function ChatArea() {
  const { conversations, currentId } = useChat();
  const { tosAccepted } = useApp();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAtBottom(true);
  };

  const updateScrollState = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setIsAtBottom(distanceFromBottom < 120);
  };

  useEffect(() => {
    updateScrollState();
  }, [currentId]);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [conversations, currentId, isAtBottom]);

  if (!tosAccepted) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)] transition-all duration-300">
        <div className="flex-1 flex items-center justify-center p-6">
          <WelcomeMessage variant="tos" />
        </div>
      </div>
    );
  }

  const currentConversation = currentId ? conversations[currentId] : null;
  const messages = currentConversation?.messages || [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)] transition-all duration-300">
      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4 min-h-0 overflow-hidden">
        <div className="relative flex-1 min-h-0">
          {/* Messages Container */}
          <div
            ref={messagesContainerRef}
            onScroll={updateScrollState}
            className="h-full overflow-y-auto p-4 flex flex-col gap-0 overscroll-contain"
          >
            {messages.length === 0 ? (
              /* Welcome Message */
              <WelcomeMessage />
            ) : (
              /* Messages */
              messages.map((message, index) => {
                const isLastAssistant = message.role === 'assistant' && index === messages.length - 1;
                return <Message key={message.id || index} message={message} isLast={isLastAssistant} />;
              })
            )}

            {/* Scroll Anchor */}
            <div ref={messagesEndRef} />
          </div>

          {!isAtBottom && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-5 right-5 z-10 w-10 h-10 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-primary)] shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--shadow-light)]"
              aria-label="Jump to latest"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
