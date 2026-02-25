import AccountPage from "@/pages/account";
import AdminPage from "@/pages/app/admin";
import ScannerPage from "@/pages/app/index";
import AppLayout from "@/pages/app/layout";
import SortPage from "@/pages/app/sort";
import AuthPage from "@/pages/auth";
import LandingPage from "@/pages/index";
import { RedirectToSignIn, SignedIn } from "@neondatabase/neon-js/auth/react";
import { createBrowserRouter, Outlet } from "react-router-dom";

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
    path: "/account/:path",
    element: <AccountPage />,
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
            path: "/app/sort",
            element: <SortPage />,
          },
          {
            path: "/app/admin",
            element: <AdminPage />,
          },
        ],
      },
    ],
  },
]);
