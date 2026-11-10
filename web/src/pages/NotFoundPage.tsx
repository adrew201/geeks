import { SearchX } from "lucide-react";
import { ButtonLink } from "../components/ui/Button.tsx";
import { EmptyState } from "../components/ui/EmptyState.tsx";

export default function NotFoundPage() {
  return (
    <div className="px-4 py-16 lg:px-12">
      <EmptyState
        icon={<SearchX />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={<ButtonLink to="/">Back to home</ButtonLink>}
      />
    </div>
  );
}
