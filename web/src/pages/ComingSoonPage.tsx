import { useLocation } from "react-router";
import { Hammer } from "lucide-react";
import { PageContainer, PageHeader } from "../components/layout/PageHeader.tsx";
import { homeRouteFor } from "../components/layout/nav-config.ts";
import { ButtonLink } from "../components/ui/Button.tsx";
import { Card } from "../components/ui/Card.tsx";
import { StatusPanel } from "../components/ui/StatusPanel.tsx";
import { useSession } from "../lib/session.ts";

/** Placeholder for planned app routes (docs/ui-audit.md §9) so nav links never land on a blank screen. */
export default function ComingSoonPage({ title }: { title: string }) {
  const session = useSession();
  const { pathname } = useLocation();
  const home = session ? homeRouteFor(session.role) : null;

  return (
    <>
      <PageHeader title={title} />
      <PageContainer>
        <Card>
          <StatusPanel
            tone="info"
            icon={<Hammer />}
            title="Coming soon"
            description="This part of Play2Pro is still being built. Check back shortly."
            actions={home && home !== pathname ? <ButtonLink to={home}>Go to my home</ButtonLink> : undefined}
          />
        </Card>
      </PageContainer>
    </>
  );
}
