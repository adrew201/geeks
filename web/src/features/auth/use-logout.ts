import { useCallback } from "react";
import { useNavigate } from "react-router";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { logout } from "../../lib/session.ts";

/** Logs out and lands on /login with no "return to" page (see wasSignedOutByUser). */
export function useLogout(): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    logout();
    void navigate(ROUTES.login, { replace: true });
  }, [navigate]);
}
