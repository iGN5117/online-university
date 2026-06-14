"use client";

import * as React from "react";
import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useColorScheme } from "@mui/material/styles";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";

function ColorModeToggle() {
  const { mode, setMode } = useColorScheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Avoid a hydration mismatch: `mode` is only known on the client.
  if (!mounted) {
    return (
      <IconButton disabled aria-label="Toggle color mode">
        <SettingsBrightnessIcon />
      </IconButton>
    );
  }

  const next = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
  const icon =
    mode === "light" ? (
      <LightModeIcon />
    ) : mode === "dark" ? (
      <DarkModeIcon />
    ) : (
      <SettingsBrightnessIcon />
    );

  return (
    <Tooltip title={`Theme: ${mode} (tap for ${next})`}>
      <IconButton
        onClick={() => setMode(next)}
        color="inherit"
        aria-label={`Switch theme, currently ${mode}`}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}

export default function Header() {
  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: "divider", backdropFilter: "blur(8px)" }}
    >
      <Container maxWidth="lg" disableGutters>
        <Toolbar sx={{ gap: 1.5 }}>
          <Typography
            component={Link}
            href="/"
            variant="h6"
            sx={{
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "text.primary",
              textDecoration: "none",
            }}
          >
            🎓 Online University
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", display: { xs: "none", sm: "block" } }}
          >
            learn anything, one card at a time
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <ColorModeToggle />
        </Toolbar>
      </Container>
    </AppBar>
  );
}
