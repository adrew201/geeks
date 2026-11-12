import { Outlet } from "react-router";
import { BrandLogo } from "../components/layout/BrandLogo.tsx";

// Minimalist auth shell: the logo, then one centred 440px card on the page background. The
// old brand panel (headline, three benefits, Gamer ID preview) is gone.

export default function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center px-5 py-5 lg:px-10">
        <BrandLogo size="sm" />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 lg:items-center lg:pt-0">
        <div className="flex w-full max-w-[440px] flex-col gap-6 rounded-xl bg-surface p-6 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
