import { createBrowserRouter } from "react-router";
import { ROUTES } from "./components/layout/nav-config.ts";
import LoginPage from "./features/auth/LoginPage.tsx";
import { RequireAuth } from "./features/auth/RequireAuth.tsx";
import SignupPage from "./features/auth/SignupPage.tsx";
import FeedPage from "./features/feed/FeedPage.tsx";
import LeaderboardPage from "./features/leaderboard/LeaderboardPage.tsx";
import PaymentReturnPage from "./features/payments/PaymentReturnPage.tsx";
import GamerProfilePage from "./features/profile/GamerProfilePage.tsx";
import PassportPage from "./features/profile/PassportPage.tsx";
import ProfileLayout from "./features/profile/ProfileLayout.tsx";
import AppLayout from "./layouts/AppLayout.tsx";
import AuthLayout from "./layouts/AuthLayout.tsx";
import CheckoutLayout from "./layouts/CheckoutLayout.tsx";
import PublicLayout from "./layouts/PublicLayout.tsx";
import ComingSoonPage from "./pages/ComingSoonPage.tsx";
import HomePage from "./pages/HomePage.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";
import { ROLE } from "./types/api.ts";

// Per docs/instructions.md: a real page is added only once it renders with real or mocked
// data. Planned nav routes (docs/ui-audit.md §9) render ComingSoonPage behind the same role
// guards they'll keep, so nav links never hit a blank screen.
// Payments: checkout starts in a modal (features/payments/PaymentModal) on the page that
// sells something, so there is no /pay/:orderId page; PayPal returns to /pay/return.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    // Public Gamer ID (README §14: no auth). App shell when signed in, public shell otherwise.
    element: <ProfileLayout />,
    children: [{ path: ROUTES.gamerProfile, element: <GamerProfilePage /> }],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.signup, element: <SignupPage /> },
      { path: ROUTES.login, element: <LoginPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        // PayPal return/cancel URL (README §15.1 step 3). Any signed-in payer; a signed-out
        // one logs in and comes back with the same query.
        element: <CheckoutLayout />,
        children: [{ path: ROUTES.payReturn, element: <PaymentReturnPage /> }],
      },
      {
        element: <AppLayout />,
        children: [
          // Any signed-in role (README §14: feed is "any user"; leaderboard is public in
          // the API but sits behind login in the app).
          { path: ROUTES.arena, element: <FeedPage /> },
          { path: ROUTES.leaderboard, element: <LeaderboardPage /> },
          {
            element: <RequireAuth roles={[ROLE.GAMER]} />,
            children: [
              { path: ROUTES.dashboard, element: <ComingSoonPage title="Dashboard" /> },
              { path: ROUTES.passport, element: <PassportPage /> },
              { path: ROUTES.wallet, element: <ComingSoonPage title="Wallet" /> },
              { path: ROUTES.submitGameplay, element: <ComingSoonPage title="Submit Gameplay" /> },
            ],
          },
          {
            element: <RequireAuth roles={[ROLE.COACH, ROLE.SPONSOR]} />,
            children: [{ path: ROUTES.discover, element: <ComingSoonPage title="Discover" /> }],
          },
          {
            element: <RequireAuth roles={[ROLE.GAMER, ROLE.SPONSOR]} />,
            children: [{ path: ROUTES.bounties, element: <ComingSoonPage title="Bounties" /> }],
          },
        ],
      },
    ],
  },
]);
