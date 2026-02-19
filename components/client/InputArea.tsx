"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/contexts/ToastContext";
import { CONSTANTS } from "@/lib/constants";
import { storeImageDataUrl } from "@/lib/image-store";
import { parseStreamingResponse } from "@/lib/streaming";
import { sendChatRequest } from "@/lib/chat-api";
import InputAttachments from "./input/InputAttachments";
import InputComposer from "./input/InputComposer";
import { ImageAttachment } from "./input/input-types";

export default function InputArea() {
  const {
    conversations,
    currentId,
    addMessage,
    updateMessage,
    uploadedFiles,
    uploadFiles,
    removeFile,
    clearFiles,
    getMessagesForApi,
    deleteLastAssistantMessage,
  } = useChat();
  const {
    tosAccepted,
    isLoading,
    setIsLoading,
    selectedModel,
    selectedImageModel,
    setSelectedModel,
    setRateLimitRemaining,
    webSearchEnabled,
    models,
    modelCapabilities,
    systemPrompt,
  } = useApp();
  const { showToast } = useToast();

  const syncRateLimit = (response: Response) => {
    const remaining = response.headers.get("X-RateLimit-Remaining");
    if (remaining !== null) {
      const parsed = parseInt(remaining, 10);
      if (!isNaN(parsed)) setRateLimitRemaining(parsed);
    }
  };

  const [message, setMessage] = useState("");
  const [imageGenerationMode, setImageGenerationMode] = useState(false);
  const [imageAttachment, setImageAttachment] =
    useState<ImageAttachment | null>(null);
  const [modelSwitchNotice, setModelSwitchNotice] = useState("");
  const [upscaleScale, setUpscaleScale] = useState(2);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sendMessageRef = useRef<typeof sendMessage>(null!);
  const rAFRef = useRef<number | null>(null);

  // Abort in-flight request on unmount to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [message]);

  // Listen for quick action events
  useEffect(() => {
    const handleQuickAction = (event: CustomEvent) => {
      setMessage(event.detail.prompt);
      textareaRef.current?.focus();

      // Auto-send the message if autoSend flag is set
      // Need to wait for state to update before submitting
      if (event.detail.autoSend) {
        rAFRef.current = requestAnimationFrame(() => {
          rAFRef.current = null;
          const form = textareaRef.current?.closest("form");
          if (form) {
            const submitEvent = new SubmitEvent("submit", {
              submitter: document.createElement("button"),
              bubbles: true,
              cancelable: true,
            });
            form.dispatchEvent(submitEvent);
          }
        });
      } else {
        setIsLoading(false);
      }
    };

    window.addEventListener(
      "sendQuickAction",
      handleQuickAction as EventListener,
    );
    return () => {
      window.removeEventListener(
        "sendQuickAction",
        handleQuickAction as EventListener,
      );
      if (rAFRef.current !== null) cancelAnimationFrame(rAFRef.current);
    };
  }, [setIsLoading]);

  // Listen for image generation mode trigger
  useEffect(() => {
    const handleEnterImageGenerationMode = () => {
      setIsLoading(false);
      setImageGenerationMode(true);
      textareaRef.current?.focus();
    };

    window.addEventListener(
      "enterImageGenerationMode",
      handleEnterImageGenerationMode as EventListener,
    );
    return () =>
      window.removeEventListener(
        "enterImageGenerationMode",
        handleEnterImageGenerationMode as EventListener,
      );
  }, [setIsLoading]);

  // Listen for regenerate event from Message action bar
  useEffect(() => {
    const handleRegenerate = async () => {
      if (isLoading) return;
      const userPrompt = deleteLastAssistantMessage();
      if (!userPrompt) return;

      const placeholderId = addMessage('assistant', 'Thinking...');
      setIsLoading(true);
      await sendMessageRef.current(userPrompt, undefined, placeholderId);
    };

    window.addEventListener('regenerateLastAssistant', handleRegenerate as EventListener);
    return () => window.removeEventListener('regenerateLastAssistant', handleRegenerate as EventListener);
  }, [isLoading, deleteLastAssistantMessage, addMessage, setIsLoading]);

  const findBestVisionModel = useCallback(() => {
    const visionModels = models.filter(
      (model) => modelCapabilities[model]?.supportsVision,
    );
    if (visionModels.length === 0) return null;

    const preferredOrder = [
      "grok",
      "gemini",
      "gpt",
      "openai",
      "qwen",
      "llama",
      "mistral",
    ];
    for (const preferred of preferredOrder) {
      const match = visionModels.find((model) =>
        model.toLowerCase().includes(preferred),
      );
      if (match) return match;
    }

    return visionModels[0];
  }, [models, modelCapabilities]);

  const enforceVisionModel = useCallback(() => {
    if (modelCapabilities[selectedModel]?.supportsVision) return true;

    const nextModel = findBestVisionModel();
    if (!nextModel) {
      showToast("No vision-capable models are available right now.", "error");
      return false;
    }

    setSelectedModel(nextModel);
    setModelSwitchNotice(`Switched to vision model: ${nextModel}`);
    return true;
  }, [
    findBestVisionModel,
    modelCapabilities,
    selectedModel,
    setModelSwitchNotice,
    setSelectedModel,
    showToast,
  ]);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(file);
    });

  const loadImage = (dataUrl: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image."));
      img.src = dataUrl;
    });

  const canvasToBlob = (
    canvas: HTMLCanvasElement,
    type: string,
    quality: number,
  ) =>
    new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, quality),
    );

  const processImageFile = async (file: File) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Only PNG, JPEG, or WebP images are supported.");
    }

    if (file.size > CONSTANTS.MAX_IMAGE_SIZE) {
      throw new Error("Image exceeds 5MB limit.");
    }

    const rawDataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(rawDataUrl);

    const maxDimension = 1536;
    const scale = Math.min(
      1,
      maxDimension / Math.max(image.width, image.height),
    );
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to process image.");

    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const quality = outputType === "image/jpeg" ? 0.85 : 0.9;
    const blob = await canvasToBlob(canvas, outputType, quality);

    if (!blob) throw new Error("Failed to encode image.");
    if (blob.size > CONSTANTS.MAX_IMAGE_SIZE) {
      throw new Error("Compressed image exceeds 5MB limit.");
    }

    const dataUrl = await readFileAsDataUrl(
      new File([blob], file.name, { type: outputType }),
    );

    return {
      dataUrl,
      name: file.name,
      size: blob.size,
      type: outputType,
    };
  };

  useEffect(() => {
    if (imageAttachment) {
      enforceVisionModel();
    }
  }, [imageAttachment, enforceVisionModel]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (imageGenerationMode && message.trim()) {
      await handleGenerateImage();
      return;
    }
    if ((!message.trim() && !imageAttachment) || isLoading || !tosAccepted)
      return;

    const messageToSend = message.trim();
    const imageToSend = imageAttachment;
    setMessage("");
    setImageAttachment(null);
    setModelSwitchNotice("");

    let storedImage: { id: string; mime: string } | null = null;
    if (imageToSend) {
      try {
        storedImage = await storeImageDataUrl(imageToSend.dataUrl);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to store image.";
        addMessage("assistant", `Error: ${errorMessage}`);
        return;
      }
    }

    // Add user message
    addMessage(
      "user",
      messageToSend,
      undefined,
      storedImage?.id,
      imageToSend?.name,
      storedImage?.mime,
    );
    const placeholderId = addMessage("assistant", "Thinking...");

    setIsLoading(true);
    // Send to API
    await sendMessage(messageToSend, imageToSend?.dataUrl, placeholderId);
  };

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, [setIsLoading]);

  const sendMessage = async (
    userMessage: string,
    imageDataUrl?: string,
    placeholderId?: string,
  ) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 2 * 60 * 1000);

    try {
      const apiMessages = getMessagesForApi({
        pendingMessages: [{ role: "user", content: userMessage }],
      });
      const messages =
        apiMessages.length > 0
          ? apiMessages
          : [{ role: "user" as const, content: userMessage }];

      const response = await sendChatRequest({
        model: selectedModel,
        messages,
        webSearchEnabled,
        imageDataUrl,
        systemPrompt,
        signal: controller.signal,
      });

      syncRateLimit(response);

      const result = await parseStreamingResponse(
        response,
        {
          onContent: (content) => {
            if (placeholderId) {
              updateMessage(placeholderId, { content });
            }
          },
          onCitations: (citations) => {
            if (placeholderId) {
              updateMessage(placeholderId, { citations });
            }
          },
        },
        { signal: controller.signal },
      );

      if (placeholderId) {
        updateMessage(placeholderId, {
          content: result.content,
          citations: result.citations,
        });
      } else {
        addMessage("assistant", result.content, result.citations);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // User cancelled — partial content is already streamed via onContent
        return;
      }
      console.error("Error sending message:", error);
      if (placeholderId) {
        updateMessage(placeholderId, {
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      } else {
        addMessage(
          "assistant",
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } finally {
      clearTimeout(timeout);
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  // Keep a ref to sendMessage so the regenerate handler always uses the latest version
  sendMessageRef.current = sendMessage;

  const handleGenerateImage = async () => {
    if (!message.trim() || isLoading || !tosAccepted) return;
    if (imageAttachment) {
      showToast(
        "Remove the attached image before generating a new one.",
        "error",
      );
      return;
    }

    const prompt = message.trim();
    setMessage("");
    setModelSwitchNotice("");

    addMessage("user", prompt);
    const placeholderId = addMessage("assistant", "Generating image...");
    setIsLoading(true);

    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-TOS-Accepted": "true",
        },
        body: JSON.stringify({ prompt, model: selectedImageModel }),
      });

      syncRateLimit(response);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Image request failed: ${response.status}${errorText ? ` - ${errorText}` : ""}`,
        );
      }

      const data = await response.json();
      if (!data.image_data_url) {
        throw new Error("Image generation returned no image data.");
      }

      const storedImage = await storeImageDataUrl(data.image_data_url);
      updateMessage(placeholderId, {
        content: "",
        imageId: storedImage.id,
        imageName: data.image_name || "Generated image",
        imageMime: storedImage.mime,
      });
      setImageGenerationMode(false);
    } catch (error) {
      console.error("Error generating image:", error);
      updateMessage(placeholderId, {
        content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        imageId: undefined,
        imageName: undefined,
        imageMime: undefined,
      });
      setImageGenerationMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpscaleImage = async () => {
    if (!imageAttachment || isLoading || !tosAccepted) return;

    const placeholderId = addMessage("assistant", "Upscaling image...");
    setIsLoading(true);

    try {
      const response = await fetch("/api/upscale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-TOS-Accepted": "true",
        },
        body: JSON.stringify({
          image_data_url: imageAttachment.dataUrl,
          scale: upscaleScale,
          enhance: true,
        }),
      });

      syncRateLimit(response);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Upscale request failed: ${response.status}${errorText ? ` - ${errorText}` : ""}`,
        );
      }

      const data = await response.json();
      if (!data.image_data_url) {
        throw new Error("Upscale returned no image data.");
      }

      const storedImage = await storeImageDataUrl(data.image_data_url);
      updateMessage(placeholderId, {
        content: "",
        imageId: storedImage.id,
        imageName: imageAttachment.name
          ? `${imageAttachment.name} (Upscaled)`
          : "Upscaled image",
        imageMime: storedImage.mime,
      });
    } catch (error) {
      console.error("Error upscaling image:", error);
      updateMessage(placeholderId, {
        content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        imageId: undefined,
        imageName: undefined,
        imageMime: undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await uploadFiles(files);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const file = files[0];
    if (!enforceVisionModel()) {
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
      return;
    }

    try {
      const processed = await processImageFile(file);
      setImageAttachment(processed);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to process image.";
      showToast(message, "error");
    } finally {
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    setImageAttachment(null);
    setModelSwitchNotice("");
  };

  const currentConversation = currentId ? conversations[currentId] : null;
  const hasMessages = (currentConversation?.messages.length ?? 0) > 0;

  return (
    <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
      <div className="max-w-5xl mx-auto w-full p-4">
        <InputAttachments
          uploadedFiles={uploadedFiles}
          imageAttachment={imageAttachment}
          modelSwitchNotice={modelSwitchNotice}
          onRemoveFile={removeFile}
          onClearFiles={clearFiles}
          onRemoveImage={handleRemoveImage}
        />

        <InputComposer
          message={message}
          isLoading={isLoading}
          tosAccepted={tosAccepted}
          imageAttachment={imageAttachment}
          upscaleScale={upscaleScale}
          hasMessages={hasMessages}
          textareaRef={textareaRef}
          fileInputRef={fileInputRef}
          imageInputRef={imageInputRef}
          placeholder={
            imageGenerationMode ? "Describe the image you want..." : undefined
          }
          onMessageChange={setMessage}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          onImageSelect={handleImageSelect}
          onFileSelect={handleFileSelect}
          onImageClick={() => imageInputRef.current?.click()}
          onFileClick={() => fileInputRef.current?.click()}
          onUpscaleScaleChange={setUpscaleScale}
          onUpscaleImage={handleUpscaleImage}
          onGenerateImage={handleGenerateImage}
          onStopGenerating={cancelGeneration}
        />
      </div>
    </div>
  );
}
