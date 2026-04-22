export interface TimesheetRow {
  person: string;
  employee_id: string;
  status: string;
  department: string;
  date: string;
  first_entry: string;
  last_entry: string;
  hours_worked: number;
  break_hours: number;
}
