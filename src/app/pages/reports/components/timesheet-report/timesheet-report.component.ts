import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { ReportFilters, DynamicFilterDialogComponent } from '../../helpers/dynamic-filter-dialog/dynamic-filter-dialog.component';
import { ApiService } from '../../../../services/api.service';
import { ExportOptionsDialogComponent, TimesheetExportMode } from './export-options-dialog/export-options-dialog.component';

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

@Component({
  selector: 'app-timesheet-report',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './timesheet-report.component.html',
  styleUrl: './timesheet-report.component.scss',
})
export class TimesheetReportComponent implements OnInit {
  displayedColumns = ['date', 'person', 'status','employee_id', 'department', 'first_entry', 'last_entry', 'hours_worked', 'break_hours', 'net_hours'];
  rows: TimesheetRow[] = [];
  loading = true;
  error: string | null = null;
  exporting = false;

  constructor(
    public dialogRef: MatDialogRef<TimesheetReportComponent>,
    @Inject(MAT_DIALOG_DATA) public filters: ReportFilters,
    private snackBar: MatSnackBar,
    private api: ApiService,
    private dialog: MatDialog,
  ) { }

  openFilterDialog(): void {
    const ref = this.dialog.open(DynamicFilterDialogComponent, {
      width: '500px',
      data: {
        title: 'Timesheet Report — Parameters',
        showDepartment: true,
        showDateRange: true,
        showEmployee: true,
        ...this.filters,
      },
    });
    ref.afterClosed().subscribe((result: ReportFilters | undefined) => {
      if (result) {
        this.filters = result;
        this.load();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      this.rows = await this.api.getTimesheetReport(
        this.filters.department ?? null,
        this.filters.dateFrom,
        this.filters.dateTo,
        this.filters.employeeId ?? null,
        this.filters.employeeType ?? null,
      );
    } catch (e) {
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }

  get totalHours(): number {
    return this.rows.reduce((sum, r) => sum + (r.hours_worked ?? 0), 0);
  }

  get totalBreakHours(): number {
    return this.rows.reduce((sum, r) => sum + (r.break_hours ?? 0), 0);
  }

  get totalNetHours(): number {
    return this.totalHours - this.totalBreakHours;
  }

  netHours(row: TimesheetRow): number {
    return Math.max(0, (row.hours_worked ?? 0) - (row.break_hours ?? 0));
  }

  formatHours(h: number): string {
    if (!h || h < 0.01) return '0h 0m';
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
  }

  formatHHMM(h: number): string {
    if (!h || h < 0) return '00:00';
    const totalMins = Math.round(h * 60);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private buildTimesheetSheet(rows: TimesheetRow[]): XLSX.WorkSheet {
    const dept = this.filters.department ?? 'All Departments';
    const from = this.filters.dateFrom;
    const to = this.filters.dateTo;
    const employeeId = this.filters.employeeId ?? 'All Users';

    const totalHours = rows.reduce((sum, r) => sum + (r.hours_worked ?? 0), 0);
    const totalBreakHours = rows.reduce((sum, r) => sum + (r.break_hours ?? 0), 0);
    const totalNetHours = totalHours - totalBreakHours;

    const data: (string | number)[][] = [
      ['Timesheet Report'],
      ['Department', dept],
      ['Date From', from],
      ['Date To', to],
      ['Employee ID', employeeId],
      [],
      ['Date', 'Employee', 'Employee ID', 'Status', 'Department', 'First Entry', 'Last Entry', 'Total Span', 'Break Time', 'Net Hours'],
      ...rows.map(r => [
        r.date,
        r.person,
        r.employee_id,
        r.status,
        r.department,
        r.first_entry,
        r.last_entry,
        this.formatHHMM(r.hours_worked),
        this.formatHHMM(r.break_hours),
        this.formatHHMM(this.netHours(r)),
      ]),
      [],
      ['', '', '', '', '', '', '', 'Total Span', 'Total Break', 'Net Hours'],
      ['', '', '', '', '', '', '',
        this.formatHHMM(totalHours),
        this.formatHHMM(totalBreakHours),
        this.formatHHMM(totalNetHours),
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 14 },
      { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    ];
    return ws;
  }

  private groupRowsByEmployee(rows: TimesheetRow[]): Map<string, TimesheetRow[]> {
    const groups = new Map<string, TimesheetRow[]>();
    for (const r of rows) {
      const key = r.employee_id || r.person;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    return groups;
  }

  private sanitizeSheetName(name: string): string {
    return (name || 'Unknown').replace(/[:\\/?*[\]]/g, '_').slice(0, 31);
  }

  private sanitizeFileName(name: string): string {
    return (name || 'Unknown').replace(/[\\/:*?"<>|]/g, '_');
  }

  private uniqueName(base: string, usedNames: Set<string>, maxLen: number): string {
    let candidate = base;
    let n = 1;
    while (usedNames.has(candidate)) {
      const suffix = `_${++n}`;
      candidate = base.slice(0, Math.max(0, maxLen - suffix.length)) + suffix;
    }
    usedNames.add(candidate);
    return candidate;
  }

  async exportToExcel(): Promise<void> {
    const ref = this.dialog.open(ExportOptionsDialogComponent, { width: '440px' });
    ref.afterClosed().subscribe(async (mode: TimesheetExportMode | undefined) => {
      if (!mode) return;

      const dept = this.filters.department ?? 'All Departments';
      const from = this.filters.dateFrom;
      const to = this.filters.dateTo;
      const baseName = `Timesheet_${dept.replace(/\s+/g, '_')}_${from}_${to}`;

      this.exporting = true;
      try {
        if (mode === 'single') {
          this.exportSingleSheet(baseName);
        } else if (mode === 'per-user-sheets') {
          this.exportPerUserSheets(baseName);
        } else {
          await this.exportPerUserZip(baseName);
        }
        this.snackBar.open('Export saved successfully', 'OK', { duration: 3000 });
      } catch (e) {
        this.snackBar.open(`Export failed: ${String(e)}`, 'Dismiss', { duration: 5000 });
      } finally {
        this.exporting = false;
      }
    });
  }

  private exportSingleSheet(baseName: string): void {
    const ws = this.buildTimesheetSheet(this.rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');
    const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    this.triggerBrowserDownload(`${baseName}.xlsx`, Array.from(new Uint8Array(buf)));
  }

  private exportPerUserSheets(baseName: string): void {
    const groups = this.groupRowsByEmployee(this.rows);
    const wb = XLSX.utils.book_new();
    const usedNames = new Set<string>();
    for (const groupRows of groups.values()) {
      const ws = this.buildTimesheetSheet(groupRows);
      const displayName = groupRows[0]?.person || 'Unknown';
      const sheetName = this.uniqueName(this.sanitizeSheetName(displayName), usedNames, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    this.triggerBrowserDownload(`${baseName}.xlsx`, Array.from(new Uint8Array(buf)));
  }

  private async exportPerUserZip(baseName: string): Promise<void> {
    const zip = new JSZip();
    const groups = this.groupRowsByEmployee(this.rows);
    const usedFileNames = new Set<string>();
    for (const groupRows of groups.values()) {
      const ws = this.buildTimesheetSheet(groupRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');
      const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const displayName = groupRows[0]?.person || 'Unknown';
      const fileName = this.uniqueName(this.sanitizeFileName(displayName), usedFileNames, 200);
      zip.file(`${fileName}.xlsx`, buf);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    this.triggerBrowserDownload(`${baseName}.zip`, zipBlob);
  }

  private triggerBrowserDownload(filename: string, bytesOrBlob: number[] | Blob): void {
    const blob = bytesOrBlob instanceof Blob
      ? bytesOrBlob
      : new Blob([new Uint8Array(bytesOrBlob)], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
