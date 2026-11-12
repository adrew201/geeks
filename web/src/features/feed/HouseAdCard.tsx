import { Megaphone, SkipForward } from "lucide-react";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { buttonClasses } from "../../components/ui/button-styles.ts";
import { Card } from "../../components/ui/Card.tsx";
import { cn } from "../../lib/cn.ts";
import type { HouseAd } from "../../types/api.ts";
import type { FeedVariant } from "./ReelCard.tsx";

// Decision 4 / README §19: the house ad has no prototype screen, so it is composed from
// the existing Card, Badge and Button styles. It takes the reel's slot and size, and the
// feed only contains it for FREE-tier users.

const SIZE: Record<FeedVariant, string> = {
  screen: "h-full w-full",
  desktop: "h-[640px] w-[420px] shrink-0",
  mobile: "h-[420px] w-full",
};

export interface HouseAdCardProps {
  variant: FeedVariant;
  ad: HouseAd;
  onNext: () => void;
}

export function HouseAdCard({ variant, ad, onNext }: HouseAdCardProps) {
  const internal = ad.ctaUrl.startsWith("/");
  return (
    <Card
      as="aside"
      large={variant !== "mobile"}
      padding={variant !== "mobile" ? "md" : "sm"}
      aria-label="Advertisement"
      className={cn("items-center justify-center text-center", SIZE[variant])}
    >
      <div
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full border border-primary bg-primary/14 text-primary"
      >
        <Megaphone className="size-8" />
      </div>
      <Badge tone="violet">House ad</Badge>
      <div className="flex flex-col gap-1">
        <h2 className="text-20 font-extrabold">{ad.title}</h2>
        <p className="max-w-[320px] text-13 text-fg-muted">{ad.body}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {internal ? (
          <ButtonLink to={ad.ctaUrl}>{ad.ctaLabel}</ButtonLink>
        ) : (
          <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses()}>
            {ad.ctaLabel}
          </a>
        )}
        <Button variant="secondary" onClick={onNext}>
          <SkipForward className="size-3.5" aria-hidden="true" />
          Next clip
        </Button>
      </div>
    </Card>
  );
}
