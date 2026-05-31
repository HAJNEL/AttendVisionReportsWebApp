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
import { ReportFilters, DynamicFilterDialogComponent } from '../../helpers/dynamic-filter-dialog/dynamic-filter-dialog.component';
import { ApiService } from '../../../../services/api.service';
import { PayrollExportRow } from '../../../../models/payroll-export-row.model';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-sage-timesheet-report',
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
  templateUrl: './sage-timesheet-report.component.html',
  styleUrl: './sage-timesheet-report.component.scss',
})
export class SageTimesheetReportComponent implements OnInit {
  displayedColumns = ['company_code', 'empno', 'emp_fullname', 'normal_Hours', 'overtime_Hours', 'public_Holiday_Hours'];
  rows: PayrollExportRow[] = [];
  loading = true;
  error: string | null = null;
  exporting = false;

  constructor(
    public dialogRef: MatDialogRef<SageTimesheetReportComponent>,
    @Inject(MAT_DIALOG_DATA) public filters: ReportFilters,
    private snackBar: MatSnackBar,
    private api: ApiService,
    private dialog: MatDialog,
  ) { }

  openFilterDialog(): void {
    const ref = this.dialog.open(DynamicFilterDialogComponent, {
      width: '500px',
      data: {
        title: 'Timesheet Report',
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
      const apiRows = await this.api.getSageTimesheetReport(
        this.filters.department ?? null,
        this.filters.dateFrom,
        this.filters.dateTo,
        this.filters.employeeId ?? null,
        this.filters.employeeType ?? null,
      );
      // Map snake_case API keys to camelCase for display/export
      this.rows = apiRows.map((r: any) => ({
        company_code: r.company_code,
        empno: r.empno,
        emp_fullname: r.emp_fullname,
        normal_Hours: r.normal_hours,
        overtime_Hours: r.overtime_hours,
        public_Holiday_Hours: r.public_holiday_hours,
        date: r.date, // Ensure your API provides this property
      }));
      // Debug: log the data displayed in the table
      console.log('Table rows:', this.rows);
    } catch (e) {
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }

  exportToExcel(): void {
    if (!this.rows.length) return;
    const data = [
      ['EmpNo', 'Employee Name', 'Normal Hours', 'Overtime Hours', 'Public Holiday Hours'],
      ...this.rows.map(r => [r.empno, r.emp_fullname, r.normal_Hours, r.overtime_Hours, r.public_Holiday_Hours]),
      [],
      ['Total', '', this.totalNormal, this.totalOvertime, this.totalPublicHoliday],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PayrollExport');
    const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const bytes = Array.from(new Uint8Array(buf));
    const defaultName = `PayrollExport_${this.filters.department ?? 'All'}_${this.filters.dateFrom}_${this.filters.dateTo}.xlsx`;
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

  get totalNormal(): number {
    return this.rows.reduce((sum, r) => sum + (r.normal_Hours ?? 0), 0);
  }
  get totalOvertime(): number {
    return this.rows.reduce((sum, r) => sum + (r.overtime_Hours ?? 0), 0);
  }
  get totalPublicHoliday(): number {
    return this.rows.reduce((sum, r) => sum + (r.public_Holiday_Hours ?? 0), 0);
  }

    /**
   * South African public holidays for 2026 (YYYY-MM-DD). Update as needed.
   */
  private static readonly PUBLIC_HOLIDAYS_2026 = [
    '2026-01-01', // New Year's Day
    '2026-03-21', // Human Rights Day
    '2026-04-03', // Good Friday
    '2026-04-06', // Family Day
    '2026-04-27', // Freedom Day
    '2026-05-01', // Workers' Day
    '2026-06-16', // Youth Day
    '2026-08-10', // National Women's Day (observed)
    '2026-09-24', // Heritage Day
    '2026-12-16', // Day of Reconciliation
    '2026-12-25', // Christmas Day
    '2026-12-26', // Day of Goodwill
  ];

   /**
   * Export to Sage VIP Payroll Batch TXT (fixed-width, 99 chars per line, no delimiters)
   */
  exportToSageVipTxt(): void {
    if (!this.rows.length) return;
    // Configurable fields
    const batchNumber = '1'; // Change as needed

    // Helper to format a value as Sage VIP field (11 digits, *100, sign, zero-padded)
    function formatValue(val: any): string {
      let num = Number(val);
      if (isNaN(num) || num <= 0) num = 0;
      const intVal = Math.round(num * 100);
      const sign = '+'; // Always positive for this export
      return intVal.toString().padStart(11, '0') + sign;
    }

    // Prepare detail lines
    const lines: string[] = [];
    let total1 = 0, total2 = 0, total3 = 0, total4 = 0, total5 = 0, total6 = 0;
    for (const row of this.rows) {
      const companyCode = (row.company_code || '001').padStart(3, '0');
      const empCode = (row.empno || '').padEnd(8, ' ');
      // Only first 3 values used: normal, overtime, public holiday
      const v1 = Number(row.normal_Hours) > 0 ? Number(row.normal_Hours) : 0;
      const v2 = Number(row.overtime_Hours) > 0 ? Number(row.overtime_Hours) : 0;
      const v3 = Number(row.public_Holiday_Hours) > 0 ? Number(row.public_Holiday_Hours) : 0;
      // Unused fields
      const v4 = 0, v5 = 0, v6 = 0;
      total1 += v1;
      total2 += v2;
      total3 += v3;
      // Format line
      let line = 'D';
      line += companyCode;
      line += batchNumber;
      line += empCode;
      line += formatValue(v1);
      line += formatValue(v2);
      line += formatValue(v3);
      line += formatValue(v4);
      line += formatValue(v5);
      line += formatValue(v6);
      line += ' '.repeat(13);
      line += 'Z';
      // Ensure 99 chars
      if (line.length !== 99) {
        console.error('Sage VIP line not 99 chars:', line, line.length);
      }
      lines.push(line);
    }
    // Trailer record
    let trailer = 'T' + ' '.repeat(12);
    trailer += formatValue(total1);
    trailer += formatValue(total2);
    trailer += formatValue(total3);
    trailer += formatValue(0);
    trailer += formatValue(0);
    trailer += formatValue(0);
    trailer += ' '.repeat(13);
    trailer += 'Z';
    if (trailer.length !== 99) {
      console.error('Sage VIP trailer not 99 chars:', trailer, trailer.length);
    }
    lines.push(trailer);

    // Download as .txt
    const defaultName = `PayrollExport_${this.filters.department ?? 'All'}_${this.filters.dateFrom}_${this.filters.dateTo}.txt`;
    this.exporting = true;
    try {
      this.triggerTxtDownload(defaultName, lines.join('\r\n'));
      this.snackBar.open('Sage VIP TXT export saved successfully', 'OK', { duration: 3000 });
    } catch (e) {
      this.snackBar.open(`TXT export failed: ${String(e)}`, 'Dismiss', { duration: 5000 });
    } finally {
      this.exporting = false;
    }
  }

  /**
   * Trigger browser download for TXT content.
   */
  private triggerTxtDownload(filename: string, txt: string): void {
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
