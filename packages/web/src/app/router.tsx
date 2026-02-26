import AccountPage from "@/app/routes/app/account";
import AdminPage from "@/app/routes/app/admin";
import BinsPage from "@/app/routes/app/bins";
import CalibratePage from "@/app/routes/app/calibrate";
import ScannerPage from "@/app/routes/app/index";
import AppLayout from "@/app/routes/app/layout";
import AuthPage from "@/app/routes/auth";
import LandingPage from "@/app/routes/index";
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
