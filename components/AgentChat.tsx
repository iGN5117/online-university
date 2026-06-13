"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Action {
  kind: "school" | "class" | "lecture" | "cards";
  id: number;
  label: string;
}

interface AgentResponse {
  reply: string;
  actions?: Action[];
}

interface ErrorResponse {
  error: string;
}

type MessageWithActions = ChatMessage & {
  actions?: Action[];
};

const STARTER_SUGGESTIONS = [
  "Teach me the basics of black holes",
  "I want to learn personal finance",
  "Add a deeper lecture on RAG",
];

export default function AgentChat() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MessageWithActions[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("agent-chat");
    if (saved) {
      try {
        const { messages: savedMessages, isOpen: savedIsOpen } = JSON.parse(saved);
        setMessages(savedMessages || []);
        setIsOpen(savedIsOpen ?? false);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Persist state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(
      "agent-chat",
      JSON.stringify({ messages, isOpen })
    );
  }, [messages, isOpen]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const newMessages: MessageWithActions[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setInputValue("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
        }),
      });

      const data = (await response.json()) as AgentResponse | ErrorResponse;

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        const errorMsg = errorData.error || "Something went wrong — try again.";
        setError(errorMsg);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errorMsg },
        ]);
      } else {
        const agentData = data as AgentResponse;
        const assistantMessage: MessageWithActions = {
          role: "assistant",
          content: agentData.reply,
        };
        if (agentData.actions && agentData.actions.length > 0) {
          assistantMessage.actions = agentData.actions;
        }
        setMessages((prev) => [...prev, assistantMessage]);

        // Refresh server-rendered pages if there were actions
        if (agentData.actions && agentData.actions.length > 0) {
          router.refresh();
        }
      }
    } catch {
      const errorMsg = "Something went wrong — try again.";
      setError(errorMsg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMsg },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStarterClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const getActionLink = (action: Action) => {
    const baseUrl = action.kind === "school"
      ? `/school/${action.id}`
      : action.kind === "class"
      ? `/class/${action.id}`
      : `/lecture/${action.id}`;

    const emoji = action.kind === "school"
      ? "🏛"
      : action.kind === "class"
      ? "📚"
      : "🃏";

    return { url: baseUrl, emoji, label: action.label };
  };

  // Collapsed state - floating action button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
        aria-label="Open Course Builder"
      >
        <span className="text-xl">✨</span>
        <span className="hidden sm:inline ml-2 text-sm font-medium">Learn something</span>
      </button>
    );
  }

  // Open state - full chat panel
  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(24rem,calc(100vw-2.5rem))] h-[min(34rem,70vh)] rounded-2xl border border-black/10 dark:border-white/15 shadow-2xl bg-white dark:bg-neutral-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-black/10 dark:border-white/15 p-4 flex items-start justify-between gap-2">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">✨ Course Builder</h2>
          <p className="text-xs opacity-60">Tell me what you want to learn</p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-lg opacity-50 hover:opacity-75 transition-opacity flex-shrink-0"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          // Empty state with starter suggestions
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="text-xs opacity-50 text-center px-2">
              Tap a suggestion to start
            </div>
            {STARTER_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleStarterClick(suggestion)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/[.05] dark:hover:bg-white/[.08] transition-colors text-left"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 text-sm break-words whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-black/[.05] dark:bg-white/[.08]"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Action chips for the last assistant message */}
            {messages.length > 0 &&
              messages[messages.length - 1].role === "assistant" &&
              messages[messages.length - 1].actions && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {messages[messages.length - 1].actions!.map((action, idx) => {
                    const { url, emoji, label } = getActionLink(action);
                    return (
                      <Link
                        key={idx}
                        href={url}
                        className="text-xs px-2 py-1 rounded border border-black/10 dark:border-white/15 hover:bg-black/[.05] dark:hover:bg-white/[.08] transition-colors inline-block"
                      >
                        {emoji} {label}
                      </Link>
                    );
                  })}
                </div>
              )}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-black/[.05] dark:bg-white/[.08] px-3 py-2 rounded-lg flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-black/40 dark:bg-white/40 animate-bounce"></span>
                  <span
                    className="w-2 h-2 rounded-full bg-black/40 dark:bg-white/40 animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></span>
                  <span
                    className="w-2 h-2 rounded-full bg-black/40 dark:bg-white/40 animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Row */}
      <div className="border-t border-black/10 dark:border-white/15 p-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isLoading) {
              handleSendMessage(inputValue);
            }
          }}
          placeholder="Tell me what to learn..."
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-sm border border-black/10 dark:border-white/15 rounded-lg bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
        />
        <button
          onClick={() => handleSendMessage(inputValue)}
          disabled={isLoading || !inputValue.trim()}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
