"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import { useColorScheme } from "@mui/material/styles";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import LogoutIcon from "@mui/icons-material/Logout";

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

function UserMenu() {
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  if (!session?.user) return null;

  const { name, email, image } = session.user;

  return (
    <>
      <Tooltip title={name || email || "Account"}>
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          size="small"
          aria-label="Account menu"
        >
          <Avatar src={image ?? undefined} sx={{ width: 32, height: 32 }}>
            {(name || email || "?").charAt(0).toUpperCase()}
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem disabled sx={{ opacity: "1 !important" }}>
          <ListItemText
            primary={name || "Signed in"}
            secondary={email}
            slotProps={{ primary: { sx: { fontWeight: 600 } } }}
          />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => signOut({ redirectTo: "/login" })}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </>
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
          <UserMenu />
        </Toolbar>
      </Container>
    </AppBar>
  );
}
