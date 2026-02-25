import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import { neon } from "./lib/auth/client";
import { router } from "./router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NeonAuthUIProvider
      authClient={neon.auth}
      redirectTo="/app"
      account={{
        basePath: "/app/account",
      }}
    >
      <RouterProvider router={router} />
    </NeonAuthUIProvider>
  </StrictMode>,
);
