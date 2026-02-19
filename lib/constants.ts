// Constants for OpenChat

export const CONSTANTS = {
  // File upload limits
  MAX_FILES: 5,
  MAX_TOTAL_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_SINGLE_FILE_SIZE: 4 * 1024 * 1024, // 4MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  CONTEXT_SIZE_THRESHOLD: 400 * 1024, // 400KB

  // Rate limiting
  RATE_LIMIT: 20,
  RATE_LIMIT_CHAT: 20,
  RATE_LIMIT_IMAGE: 5,
  RATE_LIMIT_UPSCALE: 5,
  RATE_WINDOW: 3600000, // 1 hour in ms

  // API
  VENICE_BASE_URL: "https://api.venice.ai/api/v1",

  // Pricing thresholds per 1M tokens (USD)
  MAX_INPUT_PRICE: 2.0,
  MAX_OUTPUT_PRICE: 6.0,

  // Default values
  DEFAULT_MODEL: "zai-org-glm-5",
  DEFAULT_IMAGE_MODEL: "nano-banana-pro",
  DEFAULT_IMAGE_SIZE: "1024x1024",
  DEFAULT_IMAGE_FORMAT: "png",
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 2048,

  IMAGE_MODELS: ["nano-banana-pro", "venice-sd35", "seedream-v4", "upscaler"],

  // Chat
  CHAT_CONTEXT_LIMIT: 5,
  MAX_CHAT_MESSAGES: 50,
  MAX_CHAT_MESSAGE_LENGTH: 8000,

  // Images
  MAX_UPSCALE_SCALE: 4,

  // UI
  QUICK_ACTIONS: [
    {
      icon: "💡",
      label: "Brainstorm ideas",
      prompt:
        "Help me brainstorm ideas. Ask me what topic or problem I want to explore.",
    },
    {
      icon: "🔍",
      label: "Research a topic",
      prompt:
        "Help me research a topic. Ask me what I want to learn about and I'll tell you the details.",
    },
    {
      icon: "💻",
      label: "Write some code",
      prompt:
        "Help me write some code. Ask me what language, framework, and what I'm trying to build.",
    },
    {
      icon: "🖼️",
      label: "Generate image",
      action: "generateImage",
    },
    {
      icon: "📄",
      label: "Summarize a document",
      prompt:
        "Help me summarize a document. I'll paste or upload the content and tell you what kind of summary I need.",
    },
    {
      icon: "🗣️",
      label: "Translate text",
      prompt:
        "Help me translate text between languages. Tell me the source and target languages and paste the text.",
    },
  ],
  SUPPORTED_FILE_EXTENSIONS: [".csv", ".pdf", ".xlsx", ".xls"],
} as const;
