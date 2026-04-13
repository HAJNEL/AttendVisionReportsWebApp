import { Routes } from "@angular/router";
import { LoginComponent } from "./pages/login/login.component";
import { MainLayoutComponent } from "./components/main-layout/main-layout.component";
import { DashboardComponent } from "./pages/dashboard/dashboard.component";
import { ReportsComponent } from "./pages/reports/reports.component";
import { DepartmentsComponent } from "./pages/departments/departments.component";
import { authGuard, noAuthGuard } from "./guards/auth.guard";

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
      { path: "", redirectTo: "/dashboard", pathMatch: "full" },
    ],
  },
  { path: "**", redirectTo: "/login" },
];
