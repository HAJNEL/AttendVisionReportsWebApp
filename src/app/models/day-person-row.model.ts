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
