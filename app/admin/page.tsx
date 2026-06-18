import { redirect } from "next/navigation";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { auth } from "@/auth";
import { listAllowedEmails, isOwnerEmail } from "@/lib/data";
import AllowedEmailsManager from "./AllowedEmailsManager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!isOwnerEmail(session?.user?.email)) redirect("/");

  const emails = listAllowedEmails();
  const ownerEmail = session!.user!.email!;

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography
          variant="h3"
          sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          Access control
        </Typography>
        <Typography color="text.secondary">
          Add or remove who can sign in. You ({ownerEmail}) and anyone listed in
          the server&apos;s <code>ALLOWED_EMAILS</code> are always allowed and
          aren&apos;t shown here.
        </Typography>
      </Stack>

      <AllowedEmailsManager initialEmails={emails} />
    </Stack>
  );
}
