export interface DaySummaryRow {
  employeeId: string;
  personName: string;
  department: string;
  firstEntry: string | null;
  lastEntry: string | null;
  totalRecords: number;
  issueCount: number;
}

export interface AccessRecordDto {
  id: number;
  employeeId: string;
  personName: string;
  department: string;
  date: string;
  time: string;
  attendanceStatus: string | null;
  authenticationResult: string | null;
  failed: boolean | null;
}

export interface CreateAccessRecordDto {
  employeeId: string;
  personName: string;
  department: string;
  date: string;
  time: string;
  attendanceStatus: string;
}

export interface UpdateAccessRecordDto {
  time: string;
  attendanceStatus: string;
}

export interface TimeManagementIssue {
  issueType: string;
  description: string;
  relatedTime: string | null;
}

export interface AutoFixAction {
  actionType: string;
  recordId: number | null;
  attendanceStatus: string | null;
  time: string | null;
  description: string;
}

export interface AutoFixPreviewResponse {
  issues: TimeManagementIssue[];
  proposedActions: AutoFixAction[];
}

export interface AutoFixApplyRequest {
  employeeId: string;
  personName: string;
  department: string;
  date: string;
  actions: AutoFixAction[];
}

export type DuplicateKeepStrategy = 'remove_failed_then_second' | 'always_second';

export interface TimeManagementConfig {
  companyId: string | null;
  detectMissingCheckIn: boolean;
  detectMissingCheckOut: boolean;
  detectMissingBreak: boolean;
  detectDuplicates: boolean;
  enableDoubleShift: boolean;
  workdayHours: number;
  doubleShiftHours: number;
  breakDefaultMinutes: number;
  checkInOffsetMinutes: number;
  checkOutOffsetMinutes: number;
  duplicateKeepStrategy: DuplicateKeepStrategy;
}
