import { useRole } from "@/hooks/use-role";
import AdminPage from "./routes/app/admin";
import ScannerPage from "./routes/app/index";
import AppLayout from "./routes/app/layout";
import AuthPage from "./routes/auth";
import LandingPage from "./routes/index";
import { RedirectToSignIn, SignedIn } from "@neondatabase/neon-js/auth/react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import AccountPage from "./routes/app/account";
import BinsPage from "./routes/app/bins";
import CalibratePage from "./routes/app/calibrate";

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
