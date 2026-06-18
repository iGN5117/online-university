"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";

export default function AllowedEmailsManager({
  initialEmails,
}: {
  initialEmails: string[];
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function mutate(method: "POST" | "DELETE", value: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/allowed-emails", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Something went wrong.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    if (await mutate("POST", value)) setEmail("");
  }

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box
          component="form"
          onSubmit={onAdd}
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1.5,
            alignItems: { sm: "center" },
          }}
        >
          <TextField
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            fullWidth
            size="small"
            placeholder="friend@gmail.com"
          />
          <Button
            type="submit"
            variant="contained"
            disabled={busy || !email.trim()}
            sx={{ flexShrink: 0 }}
          >
            Add
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      {initialEmails.length === 0 ? (
        <Typography color="text.secondary">
          No one added yet. Add an email above to let them sign in.
        </Typography>
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {initialEmails.map((e, i) => (
              <ListItem
                key={e}
                divider={i < initialEmails.length - 1}
                secondaryAction={
                  <Tooltip title="Remove">
                    <IconButton
                      edge="end"
                      aria-label={`Remove ${e}`}
                      disabled={busy}
                      onClick={() => mutate("DELETE", e)}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemText primary={e} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Stack>
  );
}
