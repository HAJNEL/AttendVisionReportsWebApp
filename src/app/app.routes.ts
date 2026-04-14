import { Routes } from "@angular/router";
import { LoginComponent } from "./pages/login/login.component";
import { MainLayoutComponent } from "./components/main-layout/main-layout.component";
import { DashboardComponent } from "./pages/dashboard/dashboard.component";
import { ReportsComponent } from "./pages/reports/reports.component";
import { DepartmentsComponent } from "./pages/departments/departments.component";
import { authGuard, noAuthGuard } from "./guards/auth.guard";
// import { UsersComponent } from "./pages/users/users.component";
// import { RolesComponent } from "./pages/roles/roles.component";

export const routes: Routes = [
  { path: "login", component: LoginComponent, canActivate: [noAuthGuard] },
  {
    path: "",
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: "dashboard", component: DashboardComponent },
      { path: "reports", component: ReportsComponent },
      { path: "departments", component: DepartmentsComponent },
      { path: "companies", loadComponent: () => import("./pages/companies/companies.component").then(m => m.CompaniesComponent) },
      { path: "users", loadComponent: () => import("./pages/users/users.component").then(m => m.UsersComponent) },
      { path: "roles", loadComponent: () => import("./pages/roles/roles.component").then(m => m.RolesComponent) },
      { path: "permissions", loadComponent: () => import("./pages/permissions/permissions.component").then(m => m.PermissionsComponent) },
      { path: "", redirectTo: "/dashboard", pathMatch: "full" },
    ],
  },
  { path: "**", redirectTo: "/login" },
];
