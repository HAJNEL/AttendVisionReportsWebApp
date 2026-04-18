import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import * as XLSX from 'xlsx';
import { ReportFilters, DynamicFilterDialogComponent } from '../../helpers/dynamic-filter-dialog/dynamic-filter-dialog.component';
import { ApiService } from '../../../../services/api.service';

// ── Status display definitions ───────────────────────────────────────────────
// Key = attendance_status value from DB.  Add rows here for new statuses.
const STATUS_DEFS: Record<string, { label: string; cssClass: string }> = {
  check_in:     { label: 'Check In',      cssClass: 'status-check-in'    },
  check_out:    { label: 'Check Out',     cssClass: 'status-check-out'   },
  break_out:    { label: 'Break Out',     cssClass: 'status-break-out'   },
  break_in:     { label: 'Break In',      cssClass: 'status-break-in'    },
  overtime_in:  { label: 'Overtime In',   cssClass: 'status-overtime-in' },
  overtime_out: { label: 'Overtime Out',  cssClass: 'status-overtime-out'},
};

// ── Auth display definitions ─────────────────────────────────────────────────
// Key = authentication_result value from DB (case-insensitive match).
const AUTH_DEFS: Record<string, { label: string; cssClass: string }> = {
  success:  { label: 'Success', cssClass: 'auth-success' },
  failed:   { label: 'Failed',  cssClass: 'auth-failed'  },
  failure:  { label: 'Failed',  cssClass: 'auth-failed'  },
};

export interface ClockingRow {
  date: string;
  person: string;
  employee_id: string;
  department: string;
  access_time: string;
  attendance_status: string;
  authentication_result: string;
}

@Component({
  selector: 'app-clockings-report',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  providers: [MatDialog],
  templateUrl: './clockings-report.component.html',
  styleUrls: ['./clockings-report.component.scss'],
})
export class ClockingsReportComponent implements OnInit {
  displayedColumns = ['date', 'person', 'department', 'access_time', 'attendance_status', 'authentication_result'];
  rows: ClockingRow[] = [];
  loading = true;
  error: string | null = null;
  exporting = false;

  constructor(
    public dialogRef: MatDialogRef<ClockingsReportComponent>,
    @Inject(MAT_DIALOG_DATA) public filters: ReportFilters,
    private snackBar: MatSnackBar,
    private api: ApiService,
    private dialog: MatDialog,
  ) {}

  openFilterDialog(): void {
    const ref = this.dialog.open(DynamicFilterDialogComponent, {
      width: '500px',
      data: {
        title: 'Clockings Report — Parameters',
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
      this.rows = await this.api.getClockingsReport(
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

  statusDef(raw: string): { label: string; cssClass: string } {
    return STATUS_DEFS[raw?.toLowerCase()] ?? { label: raw || '—', cssClass: 'status-default' };
  }

  authDef(raw: string): { label: string; cssClass: string } {
    return AUTH_DEFS[raw?.toLowerCase()] ?? { label: raw || '—', cssClass: 'auth-default' };
  }

  async exportToExcel(): Promise<void> {
    const dept = this.filters.department ?? 'All Departments';
    const from = this.filters.dateFrom;
    const to   = this.filters.dateTo;
    const user = this.filters.user ?? 'All Users';

    const data: (string | number)[][] = [
      ['Clockings Report'],
      ['Department', dept],
      ['Date From',  from],
      ['Date To',    to],
      ['User',       user],
      [],
      ['Date', 'Employee', 'Employee ID', 'Department', 'Time', 'Status', 'Auth'],
      ...this.rows.map(r => [
        r.date,
        r.person,
        r.employee_id,
        r.department,
        r.access_time,
        this.statusDef(r.attendance_status).label,
        this.authDef(r.authentication_result).label,
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 }, { wch: 28 }, { wch: 16 },
      { wch: 22 }, { wch: 10 }, { wch: 16 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clockings');

    const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const bytes = Array.from(new Uint8Array(buf));
    const defaultName = `Clockings_${dept.replace(/\s+/g, '_')}_${from}_${to}.xlsx`;

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
