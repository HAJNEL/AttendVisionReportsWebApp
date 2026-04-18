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

// ── Issue check definitions ───────────────────────────────────────────────────
// To add a new issue type:
//   1. Add a new entry here with the key matching the value returned by the DB.
//   2. Add a corresponding &.issue-<cssClass> rule in the SCSS file.
// ─────────────────────────────────────────────────────────────────────────────
interface IssueDef {
  label: string;
  icon: string;
  cssClass: string;
}

const ISSUE_DEFS: Record<string, IssueDef> = {
  failed_attempt:  { label: 'Failed Authentication', icon: 'block',          cssClass: 'issue-error'   },
  no_checkout:     { label: 'Missing Check-Out',      icon: 'logout',         cssClass: 'issue-warning' },
  unmatched_break: { label: 'Unmatched Break',        icon: 'free_breakfast', cssClass: 'issue-info'    },
  // ── Add new checks above this line ─────────────────────────────────────────
};

const ISSUE_FALLBACK: IssueDef = { label: 'Unknown Issue', icon: 'help_outline', cssClass: 'issue-default' };

export interface IssueRow {
  date: string;
  time_of: string;
  person: string;
  employee_id: string;
  department: string;
  issue_type: string;
}

@Component({
  selector: 'app-issue-report',
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
  templateUrl: './issue-report.component.html',
  styleUrl: './issue-report.component.scss',
})
export class IssueReportComponent implements OnInit {
  displayedColumns = ['date', 'department', 'person', 'employee_id', 'issue_type'];
  rows: IssueRow[] = [];
  loading = true;
  error: string | null = null;
  exporting = false;

  constructor(
    public dialogRef: MatDialogRef<IssueReportComponent>,
    @Inject(MAT_DIALOG_DATA) public filters: ReportFilters,
    private snackBar: MatSnackBar,
    private api: ApiService,
    private dialog: MatDialog,
  ) {}

  openFilterDialog(): void {
    const ref = this.dialog.open(DynamicFilterDialogComponent, {
      width: '500px',
      data: {
        title: 'Issue Report — Parameters',
        showDepartment: true,
        showDateRange: true,
        showUser: false,
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
      this.rows = await this.api.getIssues(
        this.filters.dateFrom,
        this.filters.dateTo,
        this.filters.department ?? null,
      );
    } catch (e) {
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }

  issueDef(issueType: string): IssueDef {
    return ISSUE_DEFS[issueType] ?? ISSUE_FALLBACK;
  }

  async exportToExcel(): Promise<void> {
    const dept = this.filters.department ?? 'All Departments';
    const from = this.filters.dateFrom;
    const to   = this.filters.dateTo;

    const data: (string | number)[][] = [
      ['Issue Report'],
      ['Department', dept],
      ['Date From',  from],
      ['Date To',    to],
      [],
      ['Date', 'Department', 'Full Name', 'Employee ID', 'Issue'],
      ...this.rows.map(r => [
        r.date,
        r.department,
        r.person,
        r.employee_id,
        this.issueDef(r.issue_type).label,
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 }, { wch: 24 }, { wch: 28 }, { wch: 16 }, { wch: 28 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Issues');

    const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const bytes = Array.from(new Uint8Array(buf));
    const defaultName = `Issues_${dept.replace(/\s+/g, '_')}_${from}_${to}.xlsx`;

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
