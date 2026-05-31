export interface PayrollExportRow {
  company_code: string;
  empno: string;
  emp_fullname: string;
  normal_Hours: number;
  overtime_Hours: number;
  public_Holiday_Hours: number;
  date: string; // ISO date string (YYYY-MM-DD)
}
