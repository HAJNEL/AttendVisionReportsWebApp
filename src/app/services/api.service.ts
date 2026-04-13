import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface LoginResponse {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
}

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface DashboardKpis {
  total_employees: number;
  checkins_today: number;
  on_site_now: number;
  failed_today: number;
}

export interface LabeledCount {
  label: string;
  count: number;
}

export interface DayAccessRow {
  label: string;
  count: number;
  names: string;
}

export interface DayEventRow {
  label: string;
  status: string;
  count: number;
  names: string;
}

export interface DayPersonRow {
  person: string;
  department: string;
  event_count: number;
  first_time: string;
  last_time: string;
  last_status: string;
  hours_worked: number;
  break_time?: number;
  work_time?: number;
}

export interface Department {
  id: number;
  departmentName: string;
  manager: string | null;
  paymentRate: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface DepartmentInput {
  departmentName: string;
  manager: string | null;
  paymentRate: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface IssueRow {
  date: string;
  time_of: string;
  person: string;
  employee_id: string;
  department: string;
  issue_type: string;
}

export interface ClockingRow {
  date: string;
  person: string;
  employee_id: string;
  department: string;
  access_time: string;
  attendance_status: string;
  authentication_result: string;
}

export interface TimesheetRow {
  person: string;
  employee_id: string;
  department: string;
  date: string;
  first_entry: string;
  last_entry: string;
  hours_worked: number;
  break_hours: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:5150/api'; // use your actual port from launchSettings.json

@Injectable({ providedIn: 'root' })
export class ApiService {

  constructor(private http: HttpClient) {}

  // ── Auth ──────────────────────────────────────────────────────────────────

  login(username: string, password: string): Promise<LoginResponse> {
    return firstValueFrom(this.http.post<LoginResponse>(`${API_BASE}/auth/login`, { username, password }));
  }

  checkUsersExist(): Promise<boolean> {
    return firstValueFrom(this.http.get<boolean>(`${API_BASE}/auth/users-exist`));
  }

  registerFirstUser(username: string, email: string, password: string, fullName: string | null): Promise<LoginResponse> {
    return firstValueFrom(this.http.post<LoginResponse>(`${API_BASE}/auth/register`, { username, email, password, fullName }));
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

  updateDepartment(id: number, input: DepartmentInput): Promise<Department> {
    return firstValueFrom(this.http.put<Department>(`${API_BASE}/departments/${id}`, input));
  }

  deleteDepartment(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_BASE}/departments/${id}`));
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
}
