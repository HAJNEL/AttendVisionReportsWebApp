
export interface TotalEmployeesDetail {
  employeeId: string;
  departmentName: string;
  fullName: string;
  checkInTime: string;
  checkOutTime: string | null;
  lastStatus: string;
}

export interface CheckinsTodayDetail {
  employeeId: string;
  departmentName: string;
  fullName: string;
  checkInTime: string;
  timeLate: string;
  timeEarly: string;
}

export interface OnSiteDetail {
  employeeId: string;
  departmentName: string;
  fullName: string;
  totalTimeWorked: string;
  timeSinceLastBreak: string;
}

export interface OnBreakDetail {
  employeeId: string;
  departmentName: string;
  fullName: string;
  breakTimeStartedTimeAgo: string;
  totalTimeOnBreak: string;
}

export interface DashboardKpis {
  totalEmployees: number;
  checkinsToday: number;
  onSiteNow: number;
  onBreakNow?: number;
  totalEmployeesDetails: TotalEmployeesDetail[];
  checkinsTodayDetails: CheckinsTodayDetail[];
  onSiteDetails: OnSiteDetail[];
  onBreakDetails: OnBreakDetail[];
}
