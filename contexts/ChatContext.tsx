"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  Citation,
  Conversation,
  UploadedFile,
  FileContext,
  ChatMessage,
} from "@/lib/types";
import { conversationsStorage } from "@/lib/storage";
import { buildFileContext, parseFile } from "@/lib/file-parser";
import { CONSTANTS } from "@/lib/constants";
import { deleteImages, storeImageDataUrl } from "@/lib/image-store";
import { generateScopedId } from "@/lib/id-generator";
import { useToast } from "@/contexts/ToastContext";

interface ChatContextType {
  conversations: Record<string, Conversation>;
  currentId: string | null;
  uploadedFiles: UploadedFile[];
  fileContext: FileContext | null;
  create: () => string;
  switch: (id: string) => void;
  delete: (id: string) => void;
  rename: (id: string, title: string) => void;
  addMessage: (
    role: "user" | "assistant",
    content: string,
    citations?: Record<string, Citation>,
    imageId?: string,
    imageName?: string,
    imageMime?: string,
  ) => string;
  addMessageToConversation: (
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    citations?: Record<string, Citation>,
    imageId?: string,
    imageName?: string,
    imageMime?: string,
  ) => string | null;
  updateMessage: (
    messageId: string,
    updates: Partial<Omit<Conversation["messages"][number], "id" | "role">>,
  ) => void;
  updateMessageInConversation: (
    conversationId: string,
    messageId: string,
    updates: Partial<Omit<Conversation["messages"][number], "id" | "role">>,
  ) => void;
  getMessagesForApi: (options?: {
    conversationId?: string;
    limit?: number;
    pendingMessages?: ChatMessage[];
  }) => ChatMessage[];
  clearCurrent: () => void;
  deleteLastAssistantMessage: () => string | null;
  uploadFiles: (files: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  clearFiles: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<
    Record<string, Conversation>
  >({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileContext, setFileContext] =
    useState<FileContext | null>(null);
  // Tracks a newly created conversation ID before React flushes setCurrentId,
  // so addMessage can append to the right conversation within the same render cycle.
  const pendingConversationIdRef = useRef<string | null>(null);
  const { showToast } = useToast();

  const generateMessageId = useCallback(() => generateScopedId("msg"), []);

  const normalizeMessages = useCallback(
    (messages: Conversation["messages"]) => {
      let changed = false;
      const updated = messages.map((message) => {
        if (message.id) return message;
        changed = true;
        return { ...message, id: generateMessageId() };
      });

      return { updated, changed };
    },
    [generateMessageId],
  );

  const migrateLegacyImages = useCallback(
    async (savedConversations: Record<string, Conversation>) => {
      const updatedConversations: Record<string, Conversation> = {};
      let hasChanges = false;

      for (const [id, conversation] of Object.entries(savedConversations)) {
        const normalized = normalizeMessages(conversation.messages);
        if (normalized.changed) {
          hasChanges = true;
        }

        const updatedMessages = await Promise.all(
          normalized.updated.map(async (message) => {
            if (!message.imageDataUrl || message.imageId) {
              return message;
            }

            try {
              const { id: imageId, mime } = await storeImageDataUrl(
                message.imageDataUrl,
              );
              hasChanges = true;
              return {
                ...message,
                imageId,
                imageMime: mime,
                imageDataUrl: undefined,
              };
            } catch (error) {
              console.error("Failed to migrate image to IndexedDB:", error);
              return message;
            }
          }),
        );

        updatedConversations[id] = {
          ...conversation,
          messages: updatedMessages,
        };
      }

      if (hasChanges) {
        setConversations(updatedConversations);
      }
    },
    [normalizeMessages, setConversations],
  );

  // Load conversations on mount
  useEffect(() => {
    const saved = conversationsStorage.get();
    const savedCurrentId = conversationsStorage.getCurrentId();
    setConversations(saved);
    setCurrentId(savedCurrentId);
    void migrateLegacyImages(saved);
  }, [migrateLegacyImages]);

  // Save conversations whenever they change
  useEffect(() => {
    conversationsStorage.set(conversations);
    if (currentId) {
      conversationsStorage.setCurrentId(currentId);
      pendingConversationIdRef.current = null;
    }
  }, [conversations, currentId]);

  // Update file context when files change
  useEffect(() => {
    if (uploadedFiles.length === 0) {
      setFileContext(null);
      return;
    }

    const parsedFiles = uploadedFiles.map((file) => ({
      fileName: file.name,
      fileSize: file.size,
      parsedAt: file.parsedAt,
      format: file.format,
      data: file.data,
    }));

    const context = buildFileContext(parsedFiles);
    setFileContext({
      files: parsedFiles,
      ...context,
    });
  }, [uploadedFiles]);

  const collectImageIds = (conversation: Conversation) =>
    conversation.messages
      .map((message) => message.imageId)
      .filter((id): id is string => Boolean(id));

  const getMessagesForApi = useCallback(
    (
      options: {
        conversationId?: string;
        limit?: number;
        pendingMessages?: ChatMessage[];
      } = {},
    ): ChatMessage[] => {
      const activeConversationId =
        options.conversationId ?? currentId ?? pendingConversationIdRef.current;
      if (!activeConversationId) return [];

      const conversation = conversations[activeConversationId];
      if (!conversation) return [];

      const maxMessages = options.limit ?? CONSTANTS.CHAT_CONTEXT_LIMIT;
      const filteredMessages = conversation.messages.filter((message) => {
        const content = message.content?.trim();
        if (!content) return false;
        return content !== "Thinking...";
      });

      const formattedMessages = filteredMessages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const pendingMessages = options.pendingMessages || [];
      const mergedMessages = [...formattedMessages];
      pendingMessages.forEach((pending) => {
        const last = mergedMessages[mergedMessages.length - 1];
        if (
          !last ||
          last.role !== pending.role ||
          last.content !== pending.content
        ) {
          mergedMessages.push(pending);
        }
      });

      const limitedMessages =
        maxMessages > 0 ? mergedMessages.slice(-maxMessages) : [];
      return limitedMessages;
    },
    [conversations, currentId],
  );

  const generateId = () => generateScopedId("conv");

  const makeMessage = (
    role: "user" | "assistant",
    content: string,
    citations?: Record<string, Citation>,
    imageId?: string,
    imageName?: string,
    imageMime?: string,
  ) => ({
    id: generateMessageId(),
    role,
    content,
    ...(citations && { citations }),
    ...(imageId && { imageId }),
    ...(imageName && { imageName }),
    ...(imageMime && { imageMime }),
  });

  const deriveTitle = (content: string, imageId?: string): string => {
    const title = content.trim() || (imageId ? "Image message" : "New Chat");
    return title.length > 50 ? title.substring(0, 47) + "..." : title;
  };

  const makeConversation = (
    id: string,
    title: string,
    messages: Conversation["messages"],
  ): Conversation => ({
    id,
    title,
    messages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    model: CONSTANTS.DEFAULT_MODEL,
  });

  const create = (): string => {
    const newId = generateId();
    setConversations((prev) => ({ ...prev, [newId]: makeConversation(newId, "New Chat", []) }));
    setCurrentId(newId);
    setUploadedFiles([]);
    setFileContext(null);
    return newId;
  };

  const switchTo = (id: string) => {
    if (conversations[id]) {
      setCurrentId(id);
      setUploadedFiles([]);
      setFileContext(null);
    }
  };

  const deleteConversation = (id: string) => {
    const conversation = conversations[id];
    if (conversation) {
      void deleteImages(collectImageIds(conversation));
    }

    setConversations((prev) => {
      const newConversations = { ...prev };
      delete newConversations[id];

      if (currentId === id) {
        const remaining = Object.values(newConversations).sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setCurrentId(remaining.length > 0 ? remaining[0].id : null);
      }

      return newConversations;
    });
  };

  const rename = (id: string, title: string) => {
    setConversations((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        title: title.trim() || "New Chat",
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const addMessage = (
    role: "user" | "assistant",
    content: string,
    citations?: Record<string, Citation>,
    imageId?: string,
    imageName?: string,
    imageMime?: string,
  ) => {
    const newMessage = makeMessage(role, content, citations, imageId, imageName, imageMime);
    const activeConversationId = currentId || pendingConversationIdRef.current;

    if (!activeConversationId || !conversations[activeConversationId]) {
      const newId = generateId();
      pendingConversationIdRef.current = newId;
      setConversations((prev) => ({
        ...prev,
        [newId]: makeConversation(newId, deriveTitle(content, imageId), [newMessage]),
      }));
      setCurrentId(newId);
      setUploadedFiles([]);
      setFileContext(null);
      return newMessage.id;
    }

    setConversations((prev) => {
      const conversation = prev[activeConversationId];
      const updatedTitle =
        role === "user" && conversation.title === "New Chat"
          ? deriveTitle(content, imageId)
          : conversation.title;

      return {
        ...prev,
        [activeConversationId]: {
          ...conversation,
          title: updatedTitle,
          messages: [...conversation.messages, newMessage],
          updatedAt: new Date().toISOString(),
        },
      };
    });

    return newMessage.id;
  };

  const addMessageToConversation = (
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    citations?: Record<string, Citation>,
    imageId?: string,
    imageName?: string,
    imageMime?: string,
  ) => {
    const newMessage = makeMessage(role, content, citations, imageId, imageName, imageMime);

    setConversations((prev) => {
      const conversation = prev[conversationId];

      if (!conversation) {
        return {
          ...prev,
          [conversationId]: makeConversation(conversationId, deriveTitle(content, imageId), [newMessage]),
        };
      }

      const updatedTitle =
        role === "user" && conversation.title === "New Chat"
          ? deriveTitle(content, imageId)
          : conversation.title;

      return {
        ...prev,
        [conversationId]: {
          ...conversation,
          title: updatedTitle,
          messages: [...conversation.messages, newMessage],
          updatedAt: new Date().toISOString(),
        },
      };
    });

    return newMessage.id;
  };

  const updateMessage = (
    messageId: string,
    updates: Partial<Omit<Conversation["messages"][number], "id" | "role">>,
  ) => {
    const activeConversationId = currentId || pendingConversationIdRef.current;
    if (!activeConversationId || !conversations[activeConversationId]) return;

    setConversations((prev) => {
      const conversation = prev[activeConversationId];
      const updatedMessages = conversation.messages.map((message) => {
        if (message.id !== messageId) return message;
        return {
          ...message,
          ...updates,
          id: message.id,
          role: message.role,
        };
      });

      return {
        ...prev,
        [activeConversationId]: {
          ...conversation,
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const updateMessageInConversation = (
    conversationId: string,
    messageId: string,
    updates: Partial<Omit<Conversation["messages"][number], "id" | "role">>,
  ) => {
    setConversations((prev) => {
      const conversation = prev[conversationId];
      if (!conversation) return prev;

      const updatedMessages = conversation.messages.map((message) => {
        if (message.id !== messageId) return message;
        return {
          ...message,
          ...updates,
          id: message.id,
          role: message.role,
        };
      });

      return {
        ...prev,
        [conversationId]: {
          ...conversation,
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const clearCurrent = () => {
    if (!currentId || !conversations[currentId]) return;

    const imageIds = collectImageIds(conversations[currentId]);
    void deleteImages(imageIds);

    setConversations((prev) => ({
      ...prev,
      [currentId]: {
        ...prev[currentId],
        messages: [],
        title: "New Chat",
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const deleteLastAssistantMessage = (): string | null => {
    const activeConversationId = currentId || pendingConversationIdRef.current;
    if (!activeConversationId || !conversations[activeConversationId]) return null;

    const conversation = conversations[activeConversationId];
    const messages = conversation.messages;

    // Find the last assistant message
    let lastAssistantIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        lastAssistantIdx = i;
        break;
      }
    }
    if (lastAssistantIdx === -1) return null;

    // Find the user message that preceded it to get the prompt
    let userPrompt: string | null = null;
    for (let i = lastAssistantIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userPrompt = messages[i].content;
        break;
      }
    }

    // Remove the last assistant message
    setConversations((prev) => {
      const conv = prev[activeConversationId];
      return {
        ...prev,
        [activeConversationId]: {
          ...conv,
          messages: conv.messages.filter((_, idx) => idx !== lastAssistantIdx),
          updatedAt: new Date().toISOString(),
        },
      };
    });

    return userPrompt;
  };

  const uploadFiles = async (files: File[]) => {
    const supportedExts = CONSTANTS.SUPPORTED_FILE_EXTENSIONS as readonly string[];
    const validFiles = files.filter((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!supportedExts.includes(ext)) {
        showToast(`Unsupported file type: ${ext}. Supported: ${supportedExts.join(', ')}`, "error");
        return false;
      }
      if (file.size > CONSTANTS.MAX_SINGLE_FILE_SIZE) {
        showToast(
          `File "${file.name}" exceeds ${CONSTANTS.MAX_SINGLE_FILE_SIZE / 1024 / 1024}MB limit`,
          "error",
        );
        return false;
      }
      return true;
    });

    const currentTotalSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
    const newTotalSize =
      currentTotalSize + validFiles.reduce((sum, f) => sum + f.size, 0);

    if (uploadedFiles.length + validFiles.length > CONSTANTS.MAX_FILES) {
      showToast(`Maximum ${CONSTANTS.MAX_FILES} files allowed`, "error");
      return;
    }

    if (newTotalSize > CONSTANTS.MAX_TOTAL_SIZE) {
      showToast(
        `Total size exceeds ${CONSTANTS.MAX_TOTAL_SIZE / 1024 / 1024}MB limit`,
        "error",
      );
      return;
    }

    const parsedFiles: UploadedFile[] = [];
    for (const file of validFiles) {
      try {
        const parsed = await parseFile(file);
        const uploadedFile: UploadedFile = {
          id: generateScopedId('file'),
          name: file.name,
          size: file.size,
          format: parsed.format,
          data: parsed.data,
          parsedAt: new Date().toISOString(),
        };
        parsedFiles.push(uploadedFile);
      } catch (error) {
        console.error("Failed to parse file:", file.name, error);
        showToast(`Failed to parse ${file.name}`, "error");
      }
    }

    setUploadedFiles((prev) => [...prev, ...parsedFiles]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearFiles = () => {
    setUploadedFiles([]);
    setFileContext(null);
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentId,
        uploadedFiles,
        fileContext,
        create,
        switch: switchTo,
        delete: deleteConversation,
        rename,
        addMessage,
        addMessageToConversation,
        updateMessage,
        updateMessageInConversation,
        getMessagesForApi,
        clearCurrent,
        deleteLastAssistantMessage,
        uploadFiles,
        removeFile,
        clearFiles,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
