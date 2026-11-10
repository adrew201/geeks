import AppLayout from "../../layouts/AppLayout.tsx";
import PublicLayout from "../../layouts/PublicLayout.tsx";
import { useSession } from "../../lib/session.ts";

/**
 * /gamers/:id is "App or public" (docs/ui-audit.md §9): GET /gamers/:id needs no auth
 * (README §14), so signed-out visitors get the public shell and everyone else the app shell.
 */
export default function ProfileLayout() {
  const session = useSession();
  return session ? <AppLayout /> : <PublicLayout />;
}
