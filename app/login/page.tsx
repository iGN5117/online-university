import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 5,
          maxWidth: 380,
          width: "100%",
          textAlign: "center",
          border: 1,
          borderColor: "divider",
          borderRadius: 4,
        }}
      >
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <Typography variant="h3" component="div">
            🎓
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Online University
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Learn anything, one card at a time.
          </Typography>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
            style={{ width: "100%" }}
          >
            <Button type="submit" variant="contained" size="large" fullWidth>
              Sign in with Google
            </Button>
          </form>
          <Typography variant="caption" color="text.secondary">
            Invite-only — access is limited to approved accounts.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
