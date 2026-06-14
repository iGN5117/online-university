"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Tooltip from "@mui/material/Tooltip";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Action {
  kind: "school" | "class" | "lecture" | "cards" | "moved" | "deleted";
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
    sessionStorage.setItem("agent-chat", JSON.stringify({ messages, isOpen }));
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

  const handleReset = () => {
    setMessages([]);
    setError(null);
    setInputValue("");
  };

  // Returns a clickable chip target, or null for actions with no page to link
  // to (e.g. a deleted lecture).
  const getActionLink = (action: Action) => {
    if (action.kind === "deleted") return null;
    const url =
      action.kind === "school"
        ? `/school/${action.id}`
        : action.kind === "class"
          ? `/class/${action.id}`
          : `/lecture/${action.id}`;

    const emoji =
      action.kind === "school" ? "🏛" : action.kind === "class" ? "📚" : "🃏";

    return { url, emoji, label: action.label };
  };

  // Collapsed state - floating action button
  if (!isOpen) {
    return (
      <Fab
        color="primary"
        onClick={() => setIsOpen(true)}
        variant="extended"
        aria-label="Open Course Builder"
        sx={{ position: "fixed", bottom: 20, right: 20, zIndex: 1300 }}
      >
        <AutoAwesomeIcon sx={{ mr: { xs: 0, sm: 1 } }} />
        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
          Learn something
        </Box>
      </Fab>
    );
  }

  // Open state - full chat panel
  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 1300,
        width: "min(24rem, calc(100vw - 2.5rem))",
        height: "min(34rem, 70vh)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 3,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          p: 2,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            ✨ Course Builder
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tell me what you want to learn
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {messages.length > 0 && (
            <Tooltip title="New chat (clear conversation)">
              <IconButton size="small" onClick={handleReset} aria-label="New chat">
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={() => setIsOpen(false)} aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* Message List */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        {messages.length === 0 ? (
          <Stack spacing={1.5} sx={{ alignItems: "center", justifyContent: "center", height: "100%" }}>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", px: 1 }}>
              Tap a suggestion to start
            </Typography>
            {STARTER_SUGGESTIONS.map((suggestion, idx) => (
              <Button
                key={idx}
                onClick={() => handleSendMessage(suggestion)}
                variant="outlined"
                color="inherit"
                fullWidth
                sx={{ justifyContent: "flex-start", textAlign: "left", fontWeight: 400 }}
              >
                {suggestion}
              </Button>
            ))}
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <Box
                  sx={{
                    maxWidth: "80%",
                    borderRadius: 2,
                    px: 1.5,
                    py: 1,
                    fontSize: "0.875rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    bgcolor: msg.role === "user" ? "primary.main" : "action.hover",
                    color: msg.role === "user" ? "primary.contrastText" : "text.primary",
                  }}
                >
                  {msg.content}
                </Box>
              </Box>
            ))}

            {/* Action chips for the last assistant message */}
            {messages.length > 0 &&
              messages[messages.length - 1].role === "assistant" &&
              messages[messages.length - 1].actions && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                  {messages[messages.length - 1].actions!.map((action, idx) => {
                    const link = getActionLink(action);
                    if (!link) return null;
                    return (
                      <Chip
                        key={idx}
                        component={Link}
                        href={link.url}
                        clickable
                        variant="outlined"
                        size="small"
                        label={`${link.emoji} ${link.label}`}
                      />
                    );
                  })}
                </Box>
              )}

            {/* Typing indicator */}
            {isLoading && (
              <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                <Box
                  sx={{
                    bgcolor: "action.hover",
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    display: "flex",
                    gap: 0.5,
                  }}
                >
                  {[0, 0.2, 0.4].map((delay) => (
                    <Box
                      key={delay}
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "text.disabled",
                        animation: "agentBounce 1s infinite",
                        animationDelay: `${delay}s`,
                        "@keyframes agentBounce": {
                          "0%, 80%, 100%": { transform: "scale(0)" },
                          "40%": { transform: "scale(1)" },
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Stack>
        )}
      </Box>

      {/* Input Row */}
      <Box
        sx={{
          borderTop: 1,
          borderColor: "divider",
          p: 1.5,
          display: "flex",
          gap: 1,
          alignItems: "center",
        }}
      >
        <TextField
          inputRef={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter inserts a newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!isLoading) handleSendMessage(inputValue);
            }
          }}
          placeholder="Tell me what to learn..."
          disabled={isLoading}
          size="small"
          fullWidth
          multiline
          maxRows={4}
        />
        <IconButton
          color="primary"
          onClick={() => handleSendMessage(inputValue)}
          disabled={isLoading || !inputValue.trim()}
          aria-label="Send"
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}
