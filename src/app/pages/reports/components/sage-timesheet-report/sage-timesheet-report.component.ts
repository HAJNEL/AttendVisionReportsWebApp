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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ReportFilters, DynamicFilterDialogComponent } from '../../helpers/dynamic-filter-dialog/dynamic-filter-dialog.component';
import { ApiService } from '../../../../services/api.service';
import { PayrollExportRow } from '../../../../models/payroll-export-row.model';
import { DepartmentPaymentRate } from '../../../../models/department-payment-rate.model';
import { DepartmentEmployee } from '../../../../models/department-user-link.model';
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
    MatCheckboxModule,
  ],
  templateUrl: './sage-timesheet-report.component.html',
  styleUrl: './sage-timesheet-report.component.scss',
})
export class SageTimesheetReportComponent implements OnInit {
  private readonly baseColumns = ['company_code', 'empno', 'emp_fullname', 'normal_Hours', 'overtime_Hours', 'public_Holiday_Hours', 'total_amount'];
  rows: PayrollExportRow[] = [];
  private employeeDeptMap = new Map<string, string>();
  private departmentRatesMap = new Map<string, DepartmentPaymentRate[]>();
  loading = true;
  error: string | null = null;
  exporting = false;
  selectionMode = false;
  selectedEmpnos = new Set<string>();

  get displayedColumns(): string[] {
    return this.selectionMode ? ['select', ...this.baseColumns] : this.baseColumns;
  }

  get isAllSelected(): boolean {
    return this.rows.length > 0 && this.rows.every(r => this.selectedEmpnos.has(r.empno));
  }

  get isIndeterminate(): boolean {
    const count = this.rows.filter(r => this.selectedEmpnos.has(r.empno)).length;
    return count > 0 && count < this.rows.length;
  }

  get exportRows(): PayrollExportRow[] {
    return this.selectionMode
      ? this.rows.filter(r => this.selectedEmpnos.has(r.empno))
      : this.rows;
  }

  toggleSelectionMode(): void {
    this.selectionMode = !this.selectionMode;
    if (!this.selectionMode) this.selectedEmpnos.clear();
  }

  isSelected(row: PayrollExportRow): boolean {
    return this.selectedEmpnos.has(row.empno);
  }

  toggleRow(row: PayrollExportRow): void {
    if (this.selectedEmpnos.has(row.empno)) {
      this.selectedEmpnos.delete(row.empno);
    } else {
      this.selectedEmpnos.add(row.empno);
    }
  }

  toggleAll(): void {
    if (this.isAllSelected) {
      this.selectedEmpnos.clear();
    } else {
      this.rows.forEach(r => this.selectedEmpnos.add(r.empno));
    }
  }

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
      // Resolve department name → UUID (filter dialog stores name, not ID)
      const allDepts = await this.api.getDepartments();
      const targetDepts = this.filters.department
        ? allDepts.filter(d => d.departmentName === this.filters.department || d.id === this.filters.department)
        : allDepts;

      console.log('[PayrollReport] targetDepts:', targetDepts.map(d => d.departmentName));

      // Fetch employees and rates per department in parallel, then build lookup maps
      const [employeeLists, rateLists, apiRows] = await Promise.all([
        Promise.all(targetDepts.map(d =>
          this.api.getEmployees(d.id).catch(() => [] as DepartmentEmployee[]).then(emps => ({ deptId: d.id, emps }))
        )),
        Promise.all(targetDepts.map(d =>
          this.api.getDepartmentPaymentRates(d.id).catch(() => [] as DepartmentPaymentRate[]).then(rates => ({ deptId: d.id, rates }))
        )),
        this.api.getSageTimesheetReport(
          this.filters.department ?? null,
          this.filters.dateFrom,
          this.filters.dateTo,
          this.filters.employeeId ?? null,
          null,
        ),
      ]);

      // Build empno → departmentId map
      this.employeeDeptMap = new Map();
      for (const { deptId, emps } of employeeLists) {
        for (const emp of emps) {
          this.employeeDeptMap.set(emp.employeeId, deptId);
        }
      }

      // Build departmentId → rates map
      this.departmentRatesMap = new Map();
      for (const { deptId, rates } of rateLists) {
        this.departmentRatesMap.set(deptId, rates);
      }

      console.log('[PayrollReport] employeeDeptMap size:', this.employeeDeptMap.size);
      console.log('[PayrollReport] departmentRatesMap:', Object.fromEntries(
        [...this.departmentRatesMap.entries()].map(([k, v]) => [k, v.map(r => `${r.rateType}/${r.appliesTo}=${r.amount}`)])
      ));

      this.rows = apiRows
        .map((r: any) => ({
          company_code: r.company_code,
          empno: r.empno,
          emp_fullname: r.emp_fullname,
          normal_Hours: r.normal_hours,
          overtime_Hours: r.overtime_hours,
          public_Holiday_Hours: r.public_holiday_hours,
          date: r.date,
        }))
        .filter(r => this.rowMatchesEmployeeType(r.empno));

      console.log('[PayrollReport] rows sample (first 3):', this.rows.slice(0, 3).map(r => ({
        empno: r.empno,
        deptId: this.employeeDeptMap.get(r.empno),
        standardRate: this.resolveRateForEmployee(r.empno, 'standard'),
        phRate: this.resolveRateForEmployee(r.empno, 'public_holiday'),
        normalAmount: this.normalAmount(r),
        phAmount: this.phAmount(r),
        totalAmount: this.totalAmount(r),
      })));
    } catch (e) {
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }

  get employeeTypeLabel(): string {
    const type = this.filters.employeeType;
    if (!type) return 'All Types';
    if (type === 'standard') return 'Standard';
    for (const rates of this.departmentRatesMap.values()) {
      const rate = rates.find(r => r.appliesTo === 'other' && r.matchKey === type);
      if (rate?.otherLabel) return rate.otherLabel;
    }
    return type;
  }

  private formatRand(value: number): string {
    return 'R ' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  exportToExcel(): void {
    const rows = this.exportRows;
    if (!rows.length) return;
    const totalNormal = rows.reduce((s, r) => s + (r.normal_Hours ?? 0), 0);
    const totalOvertime = rows.reduce((s, r) => s + (r.overtime_Hours ?? 0), 0);
    const totalPh = rows.reduce((s, r) => s + (r.public_Holiday_Hours ?? 0), 0);
    const totalNormalAmt = rows.reduce((s, r) => s + this.normalAmount(r), 0);
    const totalPhAmt = rows.reduce((s, r) => s + this.phAmount(r), 0);
    const totalAmt = rows.reduce((s, r) => s + this.totalAmount(r), 0);
    const data = [
      ['Payroll Export Report'],
      ['Department:', this.filters.department ?? 'All Departments'],
      ['Date From:', this.filters.dateFrom],
      ['Date To:', this.filters.dateTo],
      ['Employee:', this.filters.employeeId || 'All Employees'],
      ['Employee Type:', this.employeeTypeLabel],
      ['Generated:', new Date().toLocaleString('en-ZA')],
      [],
      ['EmpNo', 'Employee Name', 'Standard Rate', 'Public Holiday Rate', 'Normal Hours', 'Overtime Hours', 'Public Holiday Hours', 'Normal Amount', 'Public Holiday Amount', 'Total Amount'],
      ...rows.map(r => [
        r.empno,
        r.emp_fullname,
        this.formatRand(this.resolveRateForEmployee(r.empno, 'standard')),
        this.formatRand(this.resolveRateForEmployee(r.empno, 'public_holiday')),
        r.normal_Hours,
        r.overtime_Hours,
        r.public_Holiday_Hours,
        this.formatRand(this.normalAmount(r)),
        this.formatRand(this.phAmount(r)),
        this.formatRand(this.totalAmount(r)),
      ]),
      [],
      ['Total', '', '', '', totalNormal, totalOvertime, totalPh, this.formatRand(totalNormalAmt), this.formatRand(totalPhAmt), this.formatRand(totalAmt)],
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
  get totalNormalAmount(): number {
    return this.rows.reduce((sum, r) => sum + this.normalAmount(r), 0);
  }
  get totalPhAmount(): number {
    return this.rows.reduce((sum, r) => sum + this.phAmount(r), 0);
  }
  get totalTotalAmount(): number {
    return this.rows.reduce((sum, r) => sum + this.totalAmount(r), 0);
  }

  normalAmount(row: PayrollExportRow): number {
    return (row.normal_Hours ?? 0) * this.resolveRateForEmployee(row.empno, 'standard');
  }

  phAmount(row: PayrollExportRow): number {
    return (row.public_Holiday_Hours ?? 0) * this.resolveRateForEmployee(row.empno, 'public_holiday');
  }

  totalAmount(row: PayrollExportRow): number {
    return this.normalAmount(row) + this.phAmount(row);
  }

  private rowMatchesEmployeeType(empno: string): boolean {
    const type = this.filters.employeeType;
    if (!type) return true;

    if (type === 'standard') {
      // Standard employees: empno must NOT contain any 'other' matchKey
      for (const rates of this.departmentRatesMap.values()) {
        for (const rate of rates.filter(r => r.appliesTo === 'other' && r.matchKey)) {
          if (empno.toLowerCase().includes(rate.matchKey!.toLowerCase())) return false;
        }
      }
      return true;
    }

    // Specific group: empno must contain the matchKey
    return empno.toLowerCase().includes(type.toLowerCase());
  }

  resolveRateForEmployee(empno: string, rateType: 'standard' | 'public_holiday'): number {
    // Look up the employee's specific department, then use only that department's rates
    const deptId = this.employeeDeptMap.get(empno);
    const rates = deptId ? (this.departmentRatesMap.get(deptId) ?? []) : [];

    if (!rates.length) return 0;

    // Check if the employee's ID contains any 'other' group's matchKey
    const otherRates = rates.filter(r => r.appliesTo === 'other' && r.matchKey);
    for (const candidate of otherRates) {
      if (empno.toLowerCase().includes(candidate.matchKey!.toLowerCase())) {
        const match = rates.find(r =>
          r.appliesTo === 'other' &&
          r.matchKey === candidate.matchKey &&
          r.rateType === rateType
        );
        if (match) return match.amount;
      }
    }

    // Fall back to standard audience rates for this department
    return rates.find(r => r.rateType === rateType && r.appliesTo === 'standard')?.amount ?? 0;
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
    const rows = this.exportRows;
    if (!rows.length) return;
    const batchNumber = '1';

    function formatValue(val: any): string {
      let num = Number(val);
      if (isNaN(num) || num <= 0) num = 0;
      const intVal = Math.round(num * 100);
      const sign = '+';
      return intVal.toString().padStart(11, '0') + sign;
    }

    const lines: string[] = [];
    let total1 = 0, total2 = 0, total3 = 0, total4 = 0, total5 = 0, total6 = 0;
    for (const row of rows) {
      const companyCode = (row.empno || '').toUpperCase().includes('WE') ? '003' : (row.company_code || '001').padStart(3, '0');
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
