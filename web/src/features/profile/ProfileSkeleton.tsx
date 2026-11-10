import { Skeleton } from "../../components/ui/Skeleton.tsx";

// 12D state F "Loading", done properly: the prototype's State F button had the wrong id
// (D:567 btn-state-e-loading vs D:915 btn-state-f), so it threw and never showed. Block
// sizes follow the 12D skeleton markup (header 120px, metrics 90px, two panels 200px); the
// owner and mobile variants follow the 06D/06M/12M layouts.

export function ProfileSkeleton({ desktop, owner }: { desktop: boolean; owner: boolean }) {
  return (
    <div role="status" aria-label="Loading profile" className={desktop ? "flex flex-col gap-6" : "flex flex-col gap-3"}>
      {desktop && owner && (
        <>
          <Skeleton className="h-[140px] rounded-lg" />
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-[260px] rounded-lg" />
            <Skeleton className="h-[260px] rounded-lg" />
          </div>
          <Skeleton className="h-[280px] rounded-lg" />
        </>
      )}
      {desktop && !owner && (
        <>
          <Skeleton className="h-[120px] rounded-xl" />
          <div className="grid grid-cols-4 gap-5">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-[90px] rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-[1.2fr_1fr] gap-6">
            <Skeleton className="h-[200px] rounded-xl" />
            <Skeleton className="h-[200px] rounded-xl" />
          </div>
        </>
      )}
      {!desktop && (
        <>
          <Skeleton className="h-[110px] rounded-lg" />
          {owner ? (
            <Skeleton className="h-[150px] rounded-lg" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-14 rounded-8" />
              <Skeleton className="h-14 rounded-8" />
            </div>
          )}
          <Skeleton className="h-[90px] rounded-lg" />
          <Skeleton className="h-[150px] rounded-md" />
        </>
      )}
    </div>
  );
}
