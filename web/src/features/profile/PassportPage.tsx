import { useSession } from "../../lib/session.ts";
import { ownGamerId } from "./api.ts";
import { ProfileScreen } from "./ProfileScreen.tsx";

/** /passport: the signed-in gamer's own profile (page 06). Rendered behind RequireAuth(GAMER). */
export default function PassportPage() {
  const session = useSession();
  if (!session) return null;
  const gamerId = ownGamerId(session);
  return <ProfileScreen key={gamerId} gamerId={gamerId} ownRoute />;
}
