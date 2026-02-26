import { useRole } from "@/hooks/use-role";
import AdminPage from "@/pages/app/admin";
import ScannerPage from "@/pages/app/index";
import AppLayout from "@/pages/app/layout";
import AuthPage from "@/pages/auth";
import LandingPage from "@/pages/index";
import { RedirectToSignIn, SignedIn } from "@neondatabase/neon-js/auth/react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import AccountPage from "./pages/app/account";
import BinsPage from "./pages/app/bins";
import CalibratePage from "./pages/app/calibrate";

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
            path: "/app",
            element: <ScannerPage />,
          },
          {
            path: "/app/bins",
            element: <BinsPage />,
          },
          {
            path: "/app/calibrate",
            element: <CalibratePage />,
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
    ],
  },
]);
