import { useParams } from "react-router";
import { ProfileScreen } from "./ProfileScreen.tsx";

/** /gamers/:id: anyone's Gamer ID, gated by the viewer's role (README §18 "Who sees what"). */
export default function GamerProfilePage() {
  const { id = "" } = useParams();
  // Keyed so moving between profiles resets per-profile UI state (preview, editing).
  return <ProfileScreen key={id} gamerId={id} />;
}
