"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";

interface ModelOption {
  id: string;
  label: string;
}

export default function AgentModelManager({
  models,
  current,
}: {
  models: readonly ModelOption[];
  current: string;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(current);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onChange(model: string) {
    const previous = value;
    setValue(model);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Something went wrong.");
        setValue(previous);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
      setValue(previous);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <TextField
          select
          label="Agent model"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={busy}
          fullWidth
          size="small"
          helperText="Applies immediately to all agents — no redeploy needed."
        >
          {models.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.label}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
