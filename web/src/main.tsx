import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
// Space Grotesk tops out at 700 (prototypes asked for 800, which doesn't exist).
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import { ToastProvider } from "./components/ui/ToastProvider.tsx";
import { router } from "./routes.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </StrictMode>,
);
