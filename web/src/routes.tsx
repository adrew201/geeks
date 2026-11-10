import { createBrowserRouter } from "react-router";
import PublicLayout from "./layouts/PublicLayout.tsx";
import HomePage from "./pages/HomePage.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";

// Per docs/instructions.md: only add a page here once it renders with real or mocked data.
// Layouts ready to wire up as pages land (docs/ui-audit.md §9):
//   AuthLayout     → /login, /signup
//   AppLayout      → /dashboard, /passport, /arena, /leaderboard, /wallet, /bounties, /clips/new, /discover
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
]);
