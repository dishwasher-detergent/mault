import AccountPage from "@/app/routes/app/account";
import AdminPage from "@/app/routes/app/admin";
import BinsPage from "@/app/routes/app/bins";
import CalibratePage from "@/app/routes/app/calibrate";
import CollectionsPage from "@/app/routes/app/collections";
import ScannerPage from "@/app/routes/app/index";
import AppLayout from "@/app/routes/app/layout";
import MonitorPage from "@/app/routes/app/monitor";
import MonitorSessionsPage from "@/app/routes/app/monitor-sessions";
import SettingsPage from "@/app/routes/app/settings";
import AuthPage from "@/app/routes/auth";
import LandingPage from "@/app/routes/index";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useRole } from "@/hooks/use-role";
import { RedirectToSignIn, SignedIn } from "@neondatabase/neon-js/auth/react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

function AuthGuard() {
  return (
    <>
      <SignedIn>
        <Outlet />
      </SignedIn>
      <RedirectToSignIn />
    </>
  );
}

function AdminGuard() {
  const { isAdmin, isPending } = useRole();
  if (isPending) return null;
  if (!isAdmin) return <Navigate to="/app" replace />;
  return <Outlet />;
}

function DesktopOnlyGuard() {
  const isMobile = useIsMobile();
  if (isMobile) return <Navigate to="/app/monitor" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/auth/:path",
    element: <AuthPage />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            element: <DesktopOnlyGuard />,
            children: [
              {
                path: "/app",
                element: <ScannerPage />,
              },
              {
                path: "/app/collections",
                element: <CollectionsPage />,
              },
              {
                path: "/app/collections/:collectionGuid/bins",
                element: <BinsPage />,
              },
              {
                path: "/app/calibrate",
                element: <CalibratePage />,
              },
              {
                path: "/app/settings",
                element: <SettingsPage />,
              },
              {
                element: <AdminGuard />,
                children: [
                  {
                    path: "/app/admin",
                    element: <AdminPage />,
                  },
                ],
              },
              {
                path: "/app/account/:path",
                element: <AccountPage />,
              },
            ],
          },
          {
            path: "/app/monitor",
            element: <MonitorSessionsPage />,
          },
          {
            path: "/app/monitor/:collectionGuid",
            element: <MonitorPage />,
          },
        ],
      },
    ],
  },
]);
