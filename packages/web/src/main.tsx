import { router } from "@/app/router";
import { RouteLoadingFallback } from "@/components/route-loading-fallback";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/index.css";
import "@/lib/i18n";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider>
      <Suspense fallback={<RouteLoadingFallback />}>
        <RouterProvider router={router} />
      </Suspense>
    </TooltipProvider>
  </StrictMode>,
);
