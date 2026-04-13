import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export type {
  DashboardKpis, LabeledCount, DayAccessRow, Department,
  DayEventRow, DayPersonRow, IssueRow
} from './api.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(public readonly api: ApiService) {}

  getDepartments()                                                                      { return this.api.getDepartments(); }
  getEmployees(dept?: string | null)                                                    { return this.api.getEmployees(dept ?? null); }
  getKpis(df: string, dt: string, dept?: string | null, emp?: string | null)           { return this.api.getDashboardKpis(df, dt, dept ?? null, emp ?? null); }
  getHourlyTraffic(date: string, dept?: string | null)                                  { return this.api.getHourlyTraffic(date, dept ?? null); }
  getMonthlyAttendance(dept?: string | null, emp?: string | null)                       { return this.api.getMonthlyAttendance(dept ?? null, emp ?? null); }
  getDeptBreakdown(dept?: string | null)                                                { return this.api.getDeptBreakdown(dept ?? null); }
  getMonthlyTraffic(y: number, m: number, dept?: string | null, emp?: string | null)   { return this.api.getMonthlyTraffic(y, m, dept ?? null, emp ?? null); }
  getYearlyTraffic(y: number, dept?: string | null, emp?: string | null)               { return this.api.getYearlyTraffic(y, dept ?? null, emp ?? null); }
  getDayEventsByStatus(date: string, dept?: string | null, emp?: string | null)        { return this.api.getDayEventsByStatus(date, dept ?? null, emp ?? null); }
  getDayPeople(date: string, dept?: string | null, emp?: string | null)                { return this.api.getDayPeople(date, dept ?? null, emp ?? null); }
  getIssues(df: string, dt: string, dept?: string | null, emp?: string | null)         { return this.api.getIssues(df, dt, dept ?? null, emp ?? null); }
}
