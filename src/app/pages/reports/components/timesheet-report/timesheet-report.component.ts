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
import { ReportFilters, DynamicFilterDialogComponent } from '../../helpers/dynamic-filter-dialog/dynamic-filter-dialog.component';
import { ApiService } from '../../../../services/api.service';

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
  displayedColumns = ['date', 'person', 'department', 'first_entry', 'last_entry', 'hours_worked', 'break_hours', 'net_hours'];
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
  ) {}

  openFilterDialog(): void {
    const ref = this.dialog.open(DynamicFilterDialogComponent, {
      width: '500px',
      data: {
        title: 'Timesheet Report — Parameters',
        showDepartment: true,
        showDateRange: true,
        showUser: true,
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
        this.filters.user ?? null,
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
    const hrs  = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
  }

  async exportToExcel(): Promise<void> {
    const dept = this.filters.department ?? 'All Departments';
    const from = this.filters.dateFrom;
    const to   = this.filters.dateTo;
    const user = this.filters.user ?? 'All Users';

    const data: (string | number)[][] = [
      ['Timesheet Report'],
      ['Department', dept],
      ['Date From',  from],
      ['Date To',    to],
      ['User',       user],
      [],
      ['Date', 'Employee', 'Employee ID', 'Department', 'First Entry', 'Last Entry', 'Total Span (h)', 'Break Time (h)', 'Net Hours (h)'],
      ...this.rows.map(r => [
        r.date,
        r.person,
        r.employee_id,
        r.department,
        r.first_entry,
        r.last_entry,
        Math.round(r.hours_worked * 100) / 100,
        Math.round(r.break_hours * 100) / 100,
        Math.round(this.netHours(r) * 100) / 100,
      ]),
      [],
      ['', '', '', '', '', '', 'Total Span', 'Total Break', 'Net Hours'],
      ['', '', '', '', '', '',
        Math.round(this.totalHours * 100) / 100,
        Math.round(this.totalBreakHours * 100) / 100,
        Math.round(this.totalNetHours * 100) / 100,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 }, { wch: 28 }, { wch: 16 },
      { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');

    const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const bytes = Array.from(new Uint8Array(buf));
    const defaultName = `Timesheet_${dept.replace(/\s+/g, '_')}_${from}_${to}.xlsx`;

    this.exporting = true;
    try {
      this.triggerBrowserDownload(defaultName, bytes);
      this.snackBar.open('Export saved successfully', 'OK', { duration: 3000 });
    } catch (e) {
      this.snackBar.open(`Export failed: ${String(e)}`, 'Dismiss', { duration: 5000 });
    } finally {
      this.exporting = false;
    }
  }

  private triggerBrowserDownload(filename: string, bytes: number[]): void {
    const blob = new Blob([new Uint8Array(bytes)], {
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
