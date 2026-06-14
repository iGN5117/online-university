"use client";

import { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import SchoolIcon from "@mui/icons-material/School";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentResponse {
  reply: string;
}

interface ErrorResponse {
  error: string;
}

export default function TeacherChat({
  lectureId,
  lectureTitle,
}: {
  lectureId: number;
  lectureTitle: string;
}) {
  const storageKey = `teacher-chat-${lectureId}`;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore per-lecture state on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      try {
        const { messages: savedMessages, isOpen: savedIsOpen } = JSON.parse(saved);
        setMessages(savedMessages || []);
        setIsOpen(savedIsOpen ?? false);
      } catch {
        // ignore parse errors
      }
    }
  }, [storageKey]);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify({ messages, isOpen }));
  }, [messages, isOpen, storageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureId, messages: newMessages }),
      });
      const data = (await response.json()) as AgentResponse | ErrorResponse;
      const content = response.ok
        ? (data as AgentResponse).reply
        : (data as ErrorResponse).error || "Something went wrong — try again.";
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong — try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Collapsed - floating button (bottom-left, clear of the Course Builder FAB)
  if (!isOpen) {
    return (
      <Fab
        color="secondary"
        onClick={() => setIsOpen(true)}
        variant="extended"
        aria-label="Ask the teacher"
        sx={{ position: "fixed", bottom: 20, left: 20, zIndex: 1300 }}
      >
        <SchoolIcon sx={{ mr: { xs: 0, sm: 1 } }} />
        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
          Ask the teacher
        </Box>
      </Fab>
    );
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: 20,
        left: 20,
        zIndex: 1300,
        width: "min(24rem, calc(100vw - 2.5rem))",
        height: "min(34rem, 70vh)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 3,
      }}
    >
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
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            🧑‍🏫 Teacher
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
            Ask about: {lectureTitle}
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setIsOpen(false)} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        {messages.length === 0 ? (
          <Stack sx={{ height: "100%", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", px: 1 }}>
              Stuck on something in this lesson? Ask me anything about it.
            </Typography>
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
                    bgcolor: msg.role === "user" ? "secondary.main" : "action.hover",
                    color: msg.role === "user" ? "secondary.contrastText" : "text.primary",
                  }}
                >
                  {msg.content}
                </Box>
              </Box>
            ))}
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
                        animation: "teacherBounce 1s infinite",
                        animationDelay: `${delay}s`,
                        "@keyframes teacherBounce": {
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
          placeholder="Ask about this lesson..."
          disabled={isLoading}
          size="small"
          fullWidth
          multiline
          maxRows={4}
        />
        <IconButton
          color="secondary"
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
