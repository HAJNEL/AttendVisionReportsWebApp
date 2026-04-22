
export interface EmployeeLeave {
  id: string;
  departmentId: string;
  employeeId: string;
  type: string;
  date: string;
  fullName: string;
  fromTime?: string | null;
  toTime?: string | null;
}

export interface CreateEmployeeLeave {
  departmentId: string;
  employeeId: string;
  type: string;
  fullName: string;
  fromDate: string;
  toDate: string;
  fromTime?: string | null;
  toTime?: string | null;
}

export interface UpdateEmployeeLeave {
  type?: string;
  fullName?: string;
  fromDate?: string;
  toDate?: string;
  fromTime?: string | null;
  toTime?: string | null;
}

export interface EmployeeLeaveRange {
  id: string;
  employeeId: string;
  fullName: string;
  departmentId: string;
  departmentName?: string;
  type: string;
  fromDate: string;
  toDate: string;
  fromTime?: string | null;
  toTime?: string | null;
  days: EmployeeLeave[];
}
