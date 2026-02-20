// Core types for OpenChat

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Record<string, Citation>;
  imageId?: string;
  imageMime?: string;
  imageName?: string;
  imageDataUrl?: string;
}

export interface Citation {
  id: string;
  url?: string;
  title?: string;
  snippet?: string;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  model: string;
  isScheduled?: boolean;
}

export interface ModelCapabilities {
  supportsWebSearch: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
}

// Parsed file data types
export interface ParsedCSVData {
  type: "csv";
  rows: number;
  columns: number;
  headers: string[];
  data: string[][];
  sampleNote: string | null;
}

export interface ParsedPDFData {
  type: "pdf";
  text: string;
  pages: number;
  truncated: boolean;
  note?: string;
}

export interface ParsedXLSXData {
  type: "xlsx";
  sheets: Array<{ name: string; data: ParsedCSVData }>;
}

export type ParsedFileData = ParsedCSVData | ParsedPDFData | ParsedXLSXData;

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  format: string;
  data: ParsedFileData;
  parsedAt: string;
}

export interface FileContext {
  files: ParsedFile[];
  data: string;
  warning?: string;
  totalSize: number;
}

export interface ParsedFile {
  fileName: string;
  fileSize: number;
  parsedAt: string;
  format: string;
  data: ParsedFileData;
}

export interface ToolCall {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
  index?: number;
}

export interface SearchResult {
  url?: string;
  title?: string;
  snippet?: string;
  [key: string]: unknown;
}

export interface StreamingChunk {
  choices?: {
    index: number;
    delta?: {
      content?: string;
      tool_calls?: ToolCall[];
    };
    finish_reason?: string;
  }[];
  venice_parameters?: {
    web_search_citations?: Citation[];
    search_results?: SearchResult[];
  };
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  enable_web_search?: string;
  image_data_url?: string;
}

export interface BlockedModel {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  reason: string;
}

export interface InfoResponse {
  name: string;
  version: string;
  models: string[];
  image_models: string[];
  model_capabilities: Record<string, ModelCapabilities>;
  rate_limit: {
    requests: number;
    window: string;
    per: string;
  };
  pricing_filter: {
    max_input_price: number;
    max_output_price: number;
    blocked_models: BlockedModel[];
  };
  endpoints: {
    chat: string;
    info: string;
  };
  usage: {
    required_header: string;
    tos_url: string;
  };
  password_required: boolean;
}

export interface AppState {
  tosAccepted: boolean;
  rateLimitRemaining: number;
  isLoading: boolean;
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  webSearchEnabled: boolean;
  selectedModel: string;
  selectedImageModel: string;
}

export interface ChatState {
  conversations: Record<string, Conversation>;
  currentId: string | null;
  uploadedFiles: UploadedFile[];
  fileContext: FileContext | null;
}

export interface ScheduledPromptSettings {
  enabled: boolean;
  prompt: string;
  hour: number;
  minute: number;
  model: string;
  webSearch: "current" | "on" | "off";
  lastRunDate: string;
  lastRunTime: string;
  conversationId: string;
}
