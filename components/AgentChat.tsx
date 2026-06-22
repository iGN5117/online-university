"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
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
import { useKeyboardInset } from "@/lib/useKeyboardInset";
import {
  STARTER_TEMPLATES,
  composeBuilderPrompt,
  OPEN_BUILDER_EVENT,
  type Level,
  type Depth,
  type OpenBuilderDetail,
} from "@/lib/templates";

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

// True when `action` deleted the very school/class/lecture this URL is showing.
// Delete actions carry a label like "lecture 5"/"class 3"/"school 2", which we
// match against the entity in the path (/class/3/test still maps to "class 3").
function deletedActionMatchesPath(pathname: string, action: Action): boolean {
  if (action.kind !== "deleted") return false;
  const m = pathname.match(/^\/(lecture|class|school)\/(\d+)/);
  return !!m && action.label === `${m[1]} ${m[2]}`;
}

interface ErrorResponse {
  error: string;
}

type MessageWithActions = ChatMessage & {
  actions?: Action[];
};

const LEVELS: { value: Level; label: string }[] = [
  { value: "new", label: "New to this" },
  { value: "some", label: "Some background" },
  { value: "advanced", label: "Advanced" },
];

const DEPTHS: { value: Depth; label: string }[] = [
  { value: "overview", label: "Quick overview" },
  { value: "solid", label: "Solid foundation" },
  { value: "deep", label: "Go deep" },
];

export default function AgentChat() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MessageWithActions[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Structured intake shown on the empty state (first message only).
  const [intakeGoal, setIntakeGoal] = useState("");
  const [intakeLevel, setIntakeLevel] = useState<Level | null>(null);
  const [intakeDepth, setIntakeDepth] = useState<Depth | null>("solid");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboardInset = useKeyboardInset();

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

  // Open + prefill when a starter elsewhere (e.g. the home page) hands a goal to
  // the Course Builder. Sets both the intake (shown on the empty state) and the
  // input box (shown mid-conversation) so it lands wherever the user is.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenBuilderDetail>).detail;
      setIsOpen(true);
      if (detail?.goal) {
        setIntakeGoal(detail.goal);
        setInputValue(detail.goal);
      }
    };
    window.addEventListener(OPEN_BUILDER_EVENT, handler);
    return () => window.removeEventListener(OPEN_BUILDER_EVENT, handler);
  }, []);

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

        // Reflect the changes. If the entity in the current URL was just
        // deleted, its page now 404s (pages call notFound()), so leave for
        // home; otherwise re-fetch the server-rendered page in place.
        if (agentData.actions && agentData.actions.length > 0) {
          const viewingDeleted = agentData.actions.some((a) =>
            deletedActionMatchesPath(pathname, a),
          );
          if (viewingDeleted) router.push("/");
          else router.refresh();
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
    setIntakeGoal("");
    setIntakeLevel(null);
    setIntakeDepth("solid");
  };

  // Compose the intake answers into a first message the builder can act on, then
  // send it (handleSendMessage flips us out of the empty state into the chat).
  const handleBuild = () => {
    if (!intakeGoal.trim() || isLoading) return;
    const prompt = composeBuilderPrompt(intakeGoal, intakeLevel, intakeDepth);
    setIntakeGoal("");
    setIntakeLevel(null);
    setIntakeDepth("solid");
    handleSendMessage(prompt);
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

  // Empty-state mode: with both level and depth cleared, the intake is a raw
  // command (edit/delete/etc.) rather than a class build — the labels, prompt,
  // and button below all adapt so the same box reads coherently for both.
  const isCommandMode = intakeLevel === null && intakeDepth === null;

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
        // Lift above the soft keyboard so the input stays visible (bug: input
        // hidden behind keyboard). +20 keeps a gap above the keyboard top.
        bottom: keyboardInset + 20,
        right: 20,
        // Above the FABs (zIndex 1300) so the opaque panel covers the opposing
        // chat's button instead of overlapping it.
        zIndex: 1301,
        width: "min(24rem, calc(100vw - 2.5rem))",
        height: "min(34rem, 70vh)",
        // Never exceed the space left above the keyboard.
        maxHeight: `calc(100dvh - ${keyboardInset + 40}px)`,
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
          <Stack spacing={2} sx={{ py: 0.5 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                {isCommandMode
                  ? "What do you want to do?"
                  : "What do you want to learn?"}
              </Typography>
              <TextField
                autoFocus
                value={intakeGoal}
                onChange={(e) => setIntakeGoal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleBuild();
                  }
                }}
                placeholder={
                  isCommandMode
                    ? "e.g. delete the Cricket class"
                    : "e.g. how options trading works"
                }
                size="small"
                fullWidth
                multiline
                maxRows={3}
              />
            </Box>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                Your level
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5 }}>
                {LEVELS.map((l) => (
                  <Chip
                    key={l.value}
                    label={l.label}
                    size="small"
                    clickable
                    color={intakeLevel === l.value ? "primary" : "default"}
                    variant={intakeLevel === l.value ? "filled" : "outlined"}
                    onClick={() =>
                      setIntakeLevel(intakeLevel === l.value ? null : l.value)
                    }
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                How far do you want to go?
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5 }}>
                {DEPTHS.map((d) => (
                  <Chip
                    key={d.value}
                    label={d.label}
                    size="small"
                    clickable
                    color={intakeDepth === d.value ? "primary" : "default"}
                    variant={intakeDepth === d.value ? "filled" : "outlined"}
                    onClick={() =>
                      setIntakeDepth(intakeDepth === d.value ? null : d.value)
                    }
                  />
                ))}
              </Box>
            </Box>

            <Button
              variant="contained"
              onClick={handleBuild}
              disabled={!intakeGoal.trim() || isLoading}
              startIcon={isCommandMode ? <SendIcon /> : <AutoAwesomeIcon />}
            >
              {isCommandMode ? "Send" : "Build my class"}
            </Button>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Or start from an example:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.75 }}>
                {STARTER_TEMPLATES.map((t) => (
                  <Chip
                    key={t.title}
                    label={`${t.emoji} ${t.title}`}
                    size="small"
                    variant="outlined"
                    clickable
                    onClick={() => {
                      setIntakeGoal(t.goal);
                      // A template is a learn request: leave "command mode" so it
                      // sends as a build, not a raw instruction.
                      if (isCommandMode) setIntakeDepth("solid");
                    }}
                  />
                ))}
              </Box>
            </Box>
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

      {/* Input Row — hidden on the empty state; the intake form drives the
          first message there. */}
      {messages.length > 0 && (
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
      )}
    </Paper>
  );
}
