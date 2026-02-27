import { createBrowserRouter } from "react-router";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { RegistrationPage } from "./pages/RegistrationPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegistrationPage,
  },
  {
    path: "/home",
    Component: HomePage,
  },
  {
    path: "/admin",
    Component: AdminDashboardPage,
  },
  {
    path: "*",
    Component: LoginPage,
  },
]);