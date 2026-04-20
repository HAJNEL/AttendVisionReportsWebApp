import { DepartmentUserLink } from '../models/department-user-link.model';
import { environment } from '../../environments/environment';
import { PermissionDto, CreatePermissionDto, UpdatePermissionDto, AssignPermissionDto } from '../models/permission.model';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User, Role, UserRoleAssignment } from '../models/user.model';
import { Company } from '../models/company.model';
import { CompanyInput } from '../models/company-input.model';
import { LoginResponse } from '../models/login-response.model';
import { DbConfig } from '../models/db-config.model';
import { DashboardKpis } from '../models/dashboard-kpis.model';
import { LabeledCount } from '../models/labeled-count.model';
import { DayAccessRow } from '../models/day-access-row.model';
import { DayEventRow } from '../models/day-event-row.model';
import { DayPersonRow } from '../models/day-person-row.model';
import { Department } from '../models/department.model';
import { DepartmentInput } from '../models/department-input.model';
import { IssueRow } from '../models/issue-row.model';
import { ClockingRow } from '../models/clocking-row.model';
import { TimesheetRow } from '../models/timesheet-row.model';
import { CompanyUserLink } from '../models/company-user-link.model';
import { TimeOverride, CreateTimeOverride, UpdateTimeOverride } from '../models/time-override.model';

// ── Service ───────────────────────────────────────────────────────────────────

const API_BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {

  constructor(private http: HttpClient) {}

  // ── Auth ──────────────────────────────────────────────────────────────────
  login(username: string, password: string): Promise<{ token: string } & LoginResponse> {
    return firstValueFrom(this.http.post<{ token: string } & LoginResponse>(`${API_BASE}/auth/login`, { username, password }));
  }

  updatePassword(newPassword: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API_BASE}/auth/update-password`, { newPassword }));
  }

  checkUsersExist(): Promise<boolean> {
    return firstValueFrom(this.http.get<boolean>(`${API_BASE}/auth/users-exist`));
  }

  registerFirstUser(username: string, email: string, password: string, firstName: string, lastName: string): Promise<{ token: string } & LoginResponse> {
    return firstValueFrom(this.http.post<{ token: string } & LoginResponse>(`${API_BASE}/auth/register`, { username, email, password, firstName, lastName }));
  }

  // ── DB Config ─────────────────────────────────────────────────────────────

  getDbConfig(): Promise<DbConfig> {
    return firstValueFrom(this.http.get<DbConfig>(`${API_BASE}/config/db`));
  }

  testDbConnection(config: DbConfig): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API_BASE}/config/db/test`, config));
  }

  saveDbConfig(config: DbConfig): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API_BASE}/config/db`, config));
  }

  // ── Departments ───────────────────────────────────────────────────────────

  getDepartments(): Promise<Department[]> {
    return firstValueFrom(this.http.get<Department[]>(`${API_BASE}/departments`));
  }

  createDepartment(input: DepartmentInput): Promise<Department> {
    return firstValueFrom(this.http.post<Department>(`${API_BASE}/departments`, input));
  }


  updateDepartment(id: string, input: DepartmentInput): Promise<Department> {
    return firstValueFrom(this.http.put<Department>(`${API_BASE}/departments/${id}`, input));
  }


  deleteDepartment(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_BASE}/departments/${id}`));
  }

  getAllDepartments(): Promise<Department[]> {
    return firstValueFrom(this.http.get<Department[]>(`${API_BASE}/departments/all`));
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  getEmployees(department: string | null): Promise<string[]> {
    return firstValueFrom(this.http.get<string[]>(`${API_BASE}/dashboard/employees`, { params: department ? { department } : {} }));
  }

  getDashboardKpis(dateFrom: string, dateTo: string, department: string | null, employee: string | null = null): Promise<DashboardKpis> {
    return firstValueFrom(this.http.get<DashboardKpis>(`${API_BASE}/dashboard/kpis`, { params: { dateFrom, dateTo, ...(department ? { department } : {}), ...(employee ? { employee } : {}) } }));
  }

  getHourlyTraffic(date: string, department: string | null): Promise<DayAccessRow[]> {
    return firstValueFrom(this.http.get<DayAccessRow[]>(`${API_BASE}/dashboard/hourly-traffic`, { params: { date, ...(department ? { department } : {}) } }));
  }

  getMonthlyAttendance(department: string | null, employee: string | null = null): Promise<LabeledCount[]> {
    return firstValueFrom(this.http.get<LabeledCount[]>(`${API_BASE}/dashboard/monthly-attendance`, { params: { ...(department ? { department } : {}), ...(employee ? { employee } : {}) } }));
  }

  getDeptBreakdown(department: string | null): Promise<LabeledCount[]> {
    return firstValueFrom(this.http.get<LabeledCount[]>(`${API_BASE}/dashboard/dept-breakdown`, { params: department ? { department } : {} }));
  }

  getMonthlyTraffic(year: number, month: number, department: string | null, employee: string | null = null): Promise<LabeledCount[]> {
    return firstValueFrom(this.http.get<LabeledCount[]>(`${API_BASE}/dashboard/monthly-traffic`, { params: { year, month, ...(department ? { department } : {}), ...(employee ? { employee } : {}) } }));
  }

  getYearlyTraffic(year: number, department: string | null, employee: string | null = null): Promise<LabeledCount[]> {
    return firstValueFrom(this.http.get<LabeledCount[]>(`${API_BASE}/dashboard/yearly-traffic`, { params: { year, ...(department ? { department } : {}), ...(employee ? { employee } : {}) } }));
  }

  getDayEventsByStatus(date: string, department: string | null, employee: string | null = null): Promise<DayEventRow[]> {
    return firstValueFrom(this.http.get<DayEventRow[]>(`${API_BASE}/dashboard/day-events`, { params: { date, ...(department ? { department } : {}), ...(employee ? { employee } : {}) } }));
  }

  getDayPeople(date: string, department: string | null, employee: string | null = null): Promise<DayPersonRow[]> {
    return firstValueFrom(this.http.get<DayPersonRow[]>(`${API_BASE}/dashboard/day-people`, { params: { date, ...(department ? { department } : {}), ...(employee ? { employee } : {}) } }));
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  getIssues(dateFrom: string, dateTo: string, department: string | null, employee: string | null = null): Promise<IssueRow[]> {
    return firstValueFrom(this.http.get<IssueRow[]>(`${API_BASE}/reports/issues`, { params: { dateFrom, dateTo, ...(department ? { department } : {}), ...(employee ? { employee } : {}) } }));
  }

  getClockingsReport(dept: string | null, dateFrom: string, dateTo: string, user: string | null): Promise<ClockingRow[]> {
    return firstValueFrom(this.http.get<ClockingRow[]>(`${API_BASE}/reports/clockings`, { params: { dateFrom, dateTo, ...(dept ? { dept } : {}), ...(user ? { user } : {}) } }));
  }

  getTimesheetUsers(dept: string | null, dateFrom: string, dateTo: string): Promise<string[]> {
    return firstValueFrom(this.http.get<string[]>(`${API_BASE}/reports/timesheet/users`, { params: { dateFrom, dateTo, ...(dept ? { dept } : {}) } }));
  }

  getTimesheetReport(dept: string | null, dateFrom: string, dateTo: string, user: string | null): Promise<TimesheetRow[]> {
    return firstValueFrom(this.http.get<TimesheetRow[]>(`${API_BASE}/reports/timesheet`, { params: { dateFrom, dateTo, ...(dept ? { dept } : {}), ...(user ? { user } : {}) } }));
  }

    // ── Companies ──────────────────────────────────────────────────────────────

  getCompanies(): Promise<Company[]> {
    return firstValueFrom(this.http.get<Company[]>(`${API_BASE}/companies/`));
  }

  createCompany(input: CompanyInput): Promise<Company> {
    return firstValueFrom(this.http.post<Company>(`${API_BASE}/companies/`, input));
  }

  updateCompany(id: string, input: CompanyInput): Promise<Company> {
    return firstValueFrom(this.http.put<Company>(`${API_BASE}/companies/${id}`, input));
  }

  deleteCompany(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_BASE}/companies/${id}`));
  }

  getUsers() {
    return this.http.get<User[]>(`${API_BASE}/user`);
  }

  getUserById(id: string): Promise<User> {
    return firstValueFrom(this.http.get<User>(`${API_BASE}/user/${id}`));
  }

  createUser(user: Partial<User>) {
    return this.http.post<User>(`${API_BASE}/user`, user);
  }

  updateUser(id: string, user: Partial<User>) {
    return this.http.put<User>(`${API_BASE}/user/${id}`, user);
  }

  deleteUser(id: string) {
    return this.http.delete<void>(`${API_BASE}/user/${id}`);
  }

  // ── Roles ────────────────────────────────────────────────────────────────
  getRoles(): Promise<Role[]> {
    return firstValueFrom(this.http.get<Role[]>(`${API_BASE}/roles`));
  }

  createRole(role: Partial<Role>) {
    return this.http.post<Role>(`${API_BASE}/roles`, role);
  }

  updateRole(id: string, role: Partial<Role>) {
    return this.http.put<Role>(`${API_BASE}/roles/${id}`, role);
  }

  deleteRole(id: string) {
    return this.http.delete<void>(`${API_BASE}/roles/${id}`);
  }

  // ── User-Role Assignment ────────────────────────────────────────────────
  assignRole(data: UserRoleAssignment) {
    return this.http.post<void>(`${API_BASE}/roles/assign`, data);
  }

  removeRole(data: UserRoleAssignment) {
    return this.http.post<void>(`${API_BASE}/roles/remove`, data);
  }

    // ── Permissions ───────────────────────────────────────────────────────────

  getAllPermissions(): Promise<PermissionDto[]> {
    return firstValueFrom(this.http.get<PermissionDto[]>(`${API_BASE}/permissions`));
  }

  getPermissionById(id: number): Promise<PermissionDto> {
    return firstValueFrom(this.http.get<PermissionDto>(`${API_BASE}/permissions/${id}`));
  }

  createPermission(permission: CreatePermissionDto): Promise<PermissionDto> {
    return firstValueFrom(this.http.post<PermissionDto>(`${API_BASE}/permissions`, permission));
  }

  updatePermission(id: number, permission: UpdatePermissionDto): Promise<PermissionDto> {
    return firstValueFrom(this.http.put<PermissionDto>(`${API_BASE}/permissions/${id}`, permission));
  }

  deletePermission(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_BASE}/permissions/${id}`));
  }


  assignPermissionToRole(dto: AssignPermissionDto): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API_BASE}/permissions/assign`, dto));
  }

  removePermissionFromRole(dto: AssignPermissionDto): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API_BASE}/permissions/remove`, dto));
  }

  getPermissionsForRole(roleId: string): Promise<PermissionDto[]> {
    return firstValueFrom(this.http.get<PermissionDto[]>(`${API_BASE}/permissions/role/${roleId}`));
  }

  getUserPermissions(): Promise<PermissionDto[]> {
  return firstValueFrom(this.http.get<PermissionDto[]>(`${API_BASE}/user/permissions`));
}

  bulkAssignPermissionsToRole(roleId: string, permissionIds: number[]): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API_BASE}/permissions/assign`, { roleId, permissionIds }));
  }

    // ── Company-User Links ────────────────────────────────────────────────
  getUsersForCompany(companyId: string): Promise<CompanyUserLink[]> {
    return firstValueFrom(this.http.get<CompanyUserLink[]>(`${API_BASE}/company-users/company/${companyId}/users`));
  }

  getAllCompanyUserLinks(): Promise<CompanyUserLink[]> {
    return firstValueFrom(this.http.get<CompanyUserLink[]>(`${API_BASE}/company-users`));
  }

  createCompanyUserLink(link: { companyId: string; userId: string }): Promise<CompanyUserLink> {
    return firstValueFrom(this.http.post<CompanyUserLink>(`${API_BASE}/company-users`, link));
  }

  deleteCompanyUserLink(linkId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_BASE}/company-users/${linkId}`));
  }

    getDepartmentsForCompany(companyId: string): Promise<Department[]> {
    return firstValueFrom(this.http.get<Department[]>(`${API_BASE}/company-departments/company/${companyId}/departments`));
  }

  createCompanyDepartmentLink(link: { companyId: string; departmentId: string }): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API_BASE}/company-departments`, link));
  }

  deleteCompanyDepartmentLink(companyId: string, departmentId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_BASE}/company-departments/${companyId}/${departmentId}`));
  }

    getOnBreakNow(date: string, department: string | null, employee: string | null = null): Promise<number> {
    return firstValueFrom(this.http.get<number>(`${API_BASE}/dashboard/on-break-now`, { params: { date, ...(department ? { department } : {}), ...(employee ? { employee } : {}) } }));
  }

    // ── Department-User Links ────────────────────────────────────────────────
  // DepartmentUsersController endpoints
  // Use correct endpoint: GET /api/DepartmentUsers/by-department/{departmentId}
  getUsersForDepartment(departmentId: string): Promise<DepartmentUserLink[]> {
    return firstValueFrom(this.http.get<DepartmentUserLink[]>(`${API_BASE}/DepartmentUsers/by-department/${departmentId}`));
  }

  // Use correct endpoint: GET /api/DepartmentUsers/by-user/{userId}
  getDepartmentsForUser(userId: string): Promise<DepartmentUserLink[]> {
    return firstValueFrom(this.http.get<DepartmentUserLink[]>(`${API_BASE}/DepartmentUsers/by-user/${userId}`));
  }

  getAllDepartmentUserLinks(): Promise<DepartmentUserLink[]> {
    return firstValueFrom(this.http.get<DepartmentUserLink[]>(`${API_BASE}/DepartmentUsers`));
  }

  createDepartmentUserLink(link: { departmentId: string; userId: string }): Promise<DepartmentUserLink> {
    return firstValueFrom(this.http.post<DepartmentUserLink>(`${API_BASE}/DepartmentUsers`, link));
  }

    deleteDepartmentUserLink(linkId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_BASE}/DepartmentUsers/${linkId}`));
  }

    // ── Time Overrides ───────────────────────────────────────────────────────────
  getTimeOverrides(departmentId: string): Promise<TimeOverride[]> {
    return firstValueFrom(this.http.get<TimeOverride[]>(`${API_BASE}/timeoverrides`, { params: { departmentId } }));
  }

  createTimeOverride(data: CreateTimeOverride): Promise<TimeOverride> {
    return firstValueFrom(this.http.post<TimeOverride>(`${API_BASE}/timeoverrides`, data));
  }

  updateTimeOverride(id: string, data: UpdateTimeOverride): Promise<TimeOverride> {
    return firstValueFrom(this.http.put<TimeOverride>(`${API_BASE}/timeoverrides/${id}`, data));
  }

  deleteTimeOverride(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_BASE}/timeoverrides/${id}`));
  }
}

