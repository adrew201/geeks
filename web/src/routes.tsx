import { createBrowserRouter } from "react-router";
import { ROUTES } from "./components/layout/nav-config.ts";
import FeedPage from "./features/feed/FeedPage.tsx";
import LeaderboardPage from "./features/leaderboard/LeaderboardPage.tsx";
import AppLayout from "./layouts/AppLayout.tsx";
import PublicLayout from "./layouts/PublicLayout.tsx";
import HomePage from "./pages/HomePage.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";

// Per docs/instructions.md: only add a page here once it renders with real or mocked data.
// Layouts ready to wire up as pages land (docs/ui-audit.md §9):
//   AuthLayout     → /login, /signup
//   AppLayout      → /dashboard, /passport, /wallet, /bounties, /clips/new, /discover
//                    (/feed and /leaderboard are live below, on mocked data)
//   CheckoutLayout → /pay/:orderId, /pay/return
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
    // The gamer shell until auth lands; the audience will come from the session role.
    element: <AppLayout audience="gamer" />,
    children: [
      { path: ROUTES.arena, element: <FeedPage /> },
      { path: ROUTES.leaderboard, element: <LeaderboardPage /> },
    ],
  },
]);
