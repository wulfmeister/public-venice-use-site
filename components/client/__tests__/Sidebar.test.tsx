import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Sidebar from '../Sidebar';
import { useChat } from '@/contexts/ChatContext';
import { useApp } from '@/contexts/AppContext';

vi.mock('@/contexts/ChatContext', () => ({
  useChat: vi.fn(),
}));

vi.mock('@/contexts/AppContext', () => ({
  useApp: vi.fn(),
}));

vi.mock('../SystemPromptSettings', () => ({
  default: () => <div data-testid="system-prompt-settings" />,
}));

vi.mock('../ScheduledPrompt', () => ({
  default: () => <div data-testid="scheduled-prompt" />,
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon" />,
  Pencil: () => <span data-testid="pencil-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
  ChevronLeft: () => <span data-testid="chevron-left" />,
  Search: () => <span data-testid="search-icon" />,
}));

const mockConversations: Record<string, any> = {
  'conv-1': {
    id: 'conv-1',
    title: 'First Chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    model: 'test-model',
  },
  'conv-2': {
    id: 'conv-2',
    title: 'Second Chat',
    messages: [],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    model: 'test-model',
  },
};

const mockCreate = vi.fn();
const mockSwitch = vi.fn();
const mockDelete = vi.fn();
const mockRename = vi.fn();
const mockSetSidebarCollapsed = vi.fn();

function setupMocks(overrides: {
  conversations?: Record<string, any>;
  currentId?: string | null;
  sidebarCollapsed?: boolean;
} = {}) {
  (useChat as ReturnType<typeof vi.fn>).mockReturnValue({
    conversations: overrides.conversations ?? mockConversations,
    currentId: overrides.currentId ?? 'conv-1',
    create: mockCreate,
    switch: mockSwitch,
    delete: mockDelete,
    rename: mockRename,
  });

  (useApp as ReturnType<typeof vi.fn>).mockReturnValue({
    sidebarCollapsed: overrides.sidebarCollapsed ?? false,
    setSidebarCollapsed: mockSetSidebarCollapsed,
  });
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  setupMocks();
});

describe('Sidebar', () => {
  it('renders the New Chat button', () => {
    render(<Sidebar />);
    const buttons = screen.getAllByText('New Chat');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    expect(buttons[0]).toBeInTheDocument();
  });

  it('calls create() when New Chat button is clicked', () => {
    render(<Sidebar />);
    const buttons = screen.getAllByText('New Chat');
    fireEvent.click(buttons[0]);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('renders the conversation list', () => {
    render(<Sidebar />);
    expect(screen.getAllByText('First Chat').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Second Chat').length).toBeGreaterThanOrEqual(1);
  });

  it('filters conversations by search query', () => {
    render(<Sidebar />);
    const searchInputs = screen.getAllByPlaceholderText('Search chats...');
    fireEvent.change(searchInputs[0], { target: { value: 'First' } });

    expect(screen.getAllByText('First Chat').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByText('Second Chat')).toHaveLength(0);
  });

  it('shows "No conversations yet" when there are no conversations', () => {
    setupMocks({ conversations: {} });
    render(<Sidebar />);
    expect(screen.getAllByText('No conversations yet').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "No matching conversations" when search yields no results', () => {
    render(<Sidebar />);
    const searchInputs = screen.getAllByPlaceholderText('Search chats...');
    fireEvent.change(searchInputs[0], { target: { value: 'nonexistent' } });

    expect(screen.getAllByText('No matching conversations').length).toBeGreaterThanOrEqual(1);
  });

  it('calls switch when a conversation is clicked', () => {
    render(<Sidebar />);
    const convElements = screen.getAllByText('First Chat');
    fireEvent.click(convElements[0]);
    expect(mockSwitch).toHaveBeenCalledWith('conv-1');
  });

  it('calls confirm then deleteConversation when delete button is clicked', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<Sidebar />);
    const deleteButtons = screen.getAllByTitle('Delete conversation');
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('Delete this conversation?');
    expect(mockDelete).toHaveBeenCalledWith('conv-1');

    confirmSpy.mockRestore();
  });

  it('starts rename, types new title, and saves on Enter', () => {
    render(<Sidebar />);
    const renameButtons = screen.getAllByTitle('Rename conversation');
    fireEvent.click(renameButtons[0]);

    const renameInput = screen.getAllByPlaceholderText('Enter conversation title...')[0];
    fireEvent.change(renameInput, { target: { value: 'Renamed Chat' } });
    fireEvent.keyDown(renameInput, { key: 'Enter' });

    expect(mockRename).toHaveBeenCalledWith('conv-1', 'Renamed Chat');
  });

  it('cancels rename on Escape', () => {
    render(<Sidebar />);
    const renameButtons = screen.getAllByTitle('Rename conversation');
    fireEvent.click(renameButtons[0]);

    const renameInput = screen.getAllByPlaceholderText('Enter conversation title...')[0];
    fireEvent.change(renameInput, { target: { value: 'Renamed Chat' } });
    fireEvent.keyDown(renameInput, { key: 'Escape' });

    expect(mockRename).not.toHaveBeenCalled();
    expect(screen.getAllByText('First Chat').length).toBeGreaterThanOrEqual(1);
  });

  it('calls setSidebarCollapsed when toggle button is clicked', () => {
    render(<Sidebar />);
    const toggleButtons = screen.getAllByLabelText('Close sidebar');
    fireEvent.click(toggleButtons[0]);

    expect(mockSetSidebarCollapsed).toHaveBeenCalledWith(true);
  });

  it('shows "Scheduled" badge for scheduled conversations', () => {
    const scheduledConversations = {
      'conv-scheduled': {
        id: 'conv-scheduled',
        title: 'Scheduled Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: 'test-model',
        isScheduled: true,
      },
    };
    setupMocks({ conversations: scheduledConversations });

    render(<Sidebar />);
    expect(screen.getAllByText('Scheduled').length).toBeGreaterThanOrEqual(1);
  });
});
