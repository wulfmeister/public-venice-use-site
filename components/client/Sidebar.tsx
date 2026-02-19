'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useApp } from '@/contexts/AppContext';
import { Conversation } from '@/lib/types';
import SystemPromptSettings from './SystemPromptSettings';
import ScheduledPrompt from './ScheduledPrompt';
import { Plus, Pencil, Trash2, ChevronRight, ChevronLeft, Search } from 'lucide-react';

function getDateGroup(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfWeek = new Date(startOfToday.getTime() - startOfToday.getDay() * 86400000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  if (date >= startOfWeek) return 'This Week';
  if (date >= startOfMonth) return 'This Month';
  return 'Older';
}

export default function Sidebar() {
  const {
    conversations,
    currentId,
    create,
    switch: switchConversation,
    delete: deleteConversation,
    rename
  } = useChat();
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const closeSidebarOnMobile = () => {
    if (window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
  };

  const handleNewChat = () => {
    create();
    closeSidebarOnMobile();
  };

  const handleSwitchConversation = (id: string) => {
    switchConversation(id);
    closeSidebarOnMobile();
  };

  const handleDeleteConversation = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm('Delete this conversation?')) {
      deleteConversation(id);
    }
  };

  const startRename = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingId(id);
    setEditingTitle(conversations[id]?.title || '');
  };

  const saveRename = () => {
    if (editingId) {
      rename(editingId, editingTitle);
      setEditingId(null);
      setEditingTitle('');
    }
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveRename();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelRename();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than 24 hours
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Less than 7 days
    if (diff < 604800000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    // Default
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const { sortedConversations, groupedConversations } = useMemo(() => {
    const sorted = Object.values(conversations)
      .filter((conv) =>
        searchQuery ? conv.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
      )
      .sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

    const grouped: { group: string; items: Conversation[] }[] = [];
    let prevGroup = '';
    for (const conv of sorted) {
      const group = getDateGroup(conv.updatedAt);
      if (group !== prevGroup) {
        grouped.push({ group, items: [] });
        prevGroup = group;
      }
      grouped[grouped.length - 1].items.push(conv);
    }

    return { sortedConversations: sorted, groupedConversations: grouped };
  }, [conversations, searchQuery]);

  return (
    <>
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 bottom-0 w-[17.5rem] bg-[var(--sidebar-bg)] border-r border-[var(--border-color)] flex flex-col transition-all duration-300 z-50 overflow-hidden ${
        sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
      }`}>

        {/* Sidebar Header */}
        <div className="p-6 pb-4 bg-[var(--glass-bg)] backdrop-blur-3xl border-b border-[var(--glass-border)] flex flex-col gap-3">
          <button
            onClick={handleNewChat}
            className="w-full px-4 py-3 btn-gradient border-none rounded-2xl text-[var(--button-text)] font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all duration-100 uppercase text-sm tracking-wide"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="bg-transparent border-none text-[var(--text-primary)] text-sm outline-none w-full placeholder-[var(--text-secondary)]"
            />
          </div>
        </div>

        {/* Settings Sections */}
        <div className="overflow-y-auto flex-1 min-h-0">
          <SystemPromptSettings />
          <ScheduledPrompt />

          {/* Conversation List */}
          <div className="p-2">
            {sortedConversations.length === 0 ? (
              <div className="p-6 text-center text-[var(--text-secondary)] text-sm">
                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
              </div>
            ) : (
              groupedConversations.map(({ group, items }) => (
                <div key={group}>
                  <div className="sticky top-0 z-10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--sidebar-bg)]">
                    {group}
                  </div>
                  {items.map((conv: Conversation) => (
                    <div
                      key={conv.id}
                      className={`group p-3 rounded-xl cursor-pointer flex items-start justify-between gap-2 transition-all duration-150 mb-1 border border-transparent ${
                        conv.id === currentId
                          ? 'bg-[var(--shadow-light)] border-[var(--border-color)]'
                          : 'hover:bg-[var(--shadow-light)]'
                      }`}
                      onClick={() => handleSwitchConversation(conv.id)}
                    >
                      <div className="flex-1 min-w-0 overflow-hidden">
                        {editingId === conv.id ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={saveRename}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-[rgba(255,255,255,0.1)] border-2 border-[var(--accent)] text-[var(--text-primary)] px-2 py-1 rounded-md text-sm font-medium outline-none"
                            maxLength={50}
                            placeholder="Enter conversation title..."
                          />
                        ) : (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span
                              className="text-sm font-medium text-[var(--text-primary)] flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                            >
                              {conv.title}
                            </span>
                            {conv.isScheduled && (
                              <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-[var(--shadow-medium)] text-[var(--accent)] flex-shrink-0">
                                Scheduled
                              </span>
                            )}
                            <button
                              onClick={(e) => startRename(conv.id, e)}
                              className="opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] hover:text-[var(--accent)] p-1 rounded cursor-pointer transition-all duration-200 flex-shrink-0"
                              title="Rename conversation"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                          {formatDate(conv.updatedAt)}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] hover:text-red-400 p-1 rounded cursor-pointer transition-all duration-200 flex-shrink-0"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={`fixed left-0 top-1/2 -translate-y-1/2 w-6 h-12 bg-[var(--button-bg)] border border-[var(--border-color)] border-l-0 rounded-r-2xl cursor-pointer flex items-center justify-center text-[var(--button-text)] transition-transform duration-300 z-[60] ${
          sidebarCollapsed ? 'translate-x-0' : 'translate-x-[17.5rem]'
        }`}
        aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden ${
          sidebarCollapsed ? 'hidden' : 'block'
        }`}
        onClick={() => setSidebarCollapsed(true)}
      />
    </>
  );
}
