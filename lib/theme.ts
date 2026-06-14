import { createTheme } from "@mui/material/styles";
import LinkBehaviour from "@/components/LinkBehaviour";

// Calm teal & sage palette on a warm off-white background. With `cssVariables`
// + both color schemes, MUI auto-switches on prefers-color-scheme via media
// queries — matching the app's previous dark-mode behavior with no flash.
const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#2f8f86" }, // soft teal
        secondary: { main: "#7c9a76" }, // sage
        background: { default: "#f6f4ef", paper: "#ffffff" },
        text: { primary: "#1f2a28", secondary: "#5a6663" },
      },
    },
    dark: {
      palette: {
        primary: { main: "#5fb3a9" },
        secondary: { main: "#9bbf93" },
        background: { default: "#11161a", paper: "#191f24" },
        text: { primary: "#e7ece9", secondary: "#9fb0aa" },
      },
    },
  },
  shape: { borderRadius: 16 },
  components: {
    // Route MUI links/buttons through next/link (see LinkBehaviour).
    MuiLink: { defaultProps: { component: LinkBehaviour } },
    MuiButtonBase: { defaultProps: { LinkComponent: LinkBehaviour } },
  },
  typography: {
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
});

export default theme;
