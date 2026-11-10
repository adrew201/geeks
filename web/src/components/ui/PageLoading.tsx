import { Spinner } from "./Spinner.tsx";

/** Full-area spinner while a lazy page loads (routes.tsx hydrateFallbackElement). */
export function PageLoading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center text-primary">
      <Spinner size={32} label="Loading page" />
    </div>
  );
}
