import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui";
import "@neondatabase/neon-js/ui/css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import { neon } from "./lib/auth/client";
import { router } from "./router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NeonAuthUIProvider authClient={neon.auth}>
      <RouterProvider router={router} />
    </NeonAuthUIProvider>
  </StrictMode>,
);
