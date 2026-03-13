import { router } from "@/app/router";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/index.css";
import { neon } from "@/lib/auth/client";
import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NeonAuthUIProvider
      authClient={neon.auth}
      redirectTo="/app"
      account={{
        basePath: "/app/account",
      }}
    >
      <TooltipProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <RouterProvider router={router} />
        </ThemeProvider>
      </TooltipProvider>
    </NeonAuthUIProvider>
  </StrictMode>,
);
