import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../../services/api.service';
import { DepartmentPaymentRate } from '../../../../models/department-payment-rate.model';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { DepartmentEmployee } from '../../../../models/department-user-link.model';

/** Configuration passed via MAT_DIALOG_DATA when opening this dialog. */
export interface DynamicFilterConfig {
  /** Dialog title, e.g. "Timesheet Report — Parameters" */
  title: string;
  /** Show the department dropdown. Defaults to true. */
  showDepartment?: boolean;
  /** Show the date-range pickers. Defaults to true. */
  showDateRange?: boolean;
  /** Show the user dropdown. Defaults to true. */
  showEmployee?: boolean;
}

/** The value this dialog closes with on Run. */
export interface ReportFilters {
  department: string | null;
  dateFrom: string;
  dateTo: string;
  employeeId: string | null;
  employeeType: string | null;
}

interface DepartmentOption {
  id: string;
  departmentName: string;
}

@Component({
  selector: 'app-dynamic-filter-dialog',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dynamic-filter-dialog.component.html',
  styleUrl: './dynamic-filter-dialog.component.scss',
})
export class DynamicFilterDialogComponent implements OnInit, OnDestroy {
  form = new FormGroup({
    department: new FormControl<string>(''),
    dateFrom: new FormControl<Date | null>(this.firstOfMonth(), Validators.required),
    dateTo: new FormControl<Date | null>(new Date(), Validators.required),
    employeeId: new FormControl<string>({ value: '', disabled: true }),
    employeeType: new FormControl<string>(''),
  });
  paymentRates: DepartmentPaymentRate[] = [];
  employeeTypeOptions: { label: string, value: string }[] = [];

  departments: DepartmentOption[] = [];
  employees: DepartmentEmployee[] = [];
  loadingEmployees = false;
  showAllDepartmentsOption = false;
  private patchingDepartment = false;

  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<DynamicFilterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public config: DynamicFilterConfig,
    private api: ApiService,
  ) { }

  async ngOnInit(): Promise<void> {
    // Load departments if required
    if (this.config.showDepartment !== false) {
      this.departments = await this.api.getDepartments();
      // Set defaults to '' to match value="" on the All options
      this.form.controls.department.setValue('');
      this.showAllDepartmentsOption = this.departments.length > 1;
      await this.loadEmployeeTypeOptions('');
      this.form.controls.employeeType.setValue('');

      // Subscribe to department changes to load employees and update type options

      this.form.controls.department.valueChanges
        .pipe(debounceTime(300), takeUntil(this.destroy$))
        .subscribe((deptId: string | null) => {
          (async () => {
            this.loadingEmployees = true;
            let departmentId: string | null = null;
            if (deptId && deptId !== '') {
              const deptObj = this.departments.find(d => d.departmentName === deptId || d.id === deptId);
              departmentId = deptObj ? deptObj.id : deptId;
            }
            this.employees = this.deduplicateEmployees(await this.api.getEmployees(departmentId).catch(() => []));
            if (!this.patchingDepartment) {
              this.form.controls.employeeId.setValue('');
            }
            this.loadingEmployees = false;
            if (this.employees.length > 0) {
              this.form.controls.employeeId.enable();
            } else {
              this.form.controls.employeeId.disable();
            }
            await this.loadEmployeeTypeOptions(deptId);
          })();
        });
    } else {
      this.form.controls.employeeId.disable();
    }

    // Edit mode: if filters are provided (e.g., via parent), patch form and ensure employee list includes selected employee
    if ((this as any).filters) {
      const entry = (this as any).filters;
      this.patchingDepartment = true;
      this.loadingEmployees = true;
      const deptId = entry.department && entry.department !== 'all' ? entry.department : null;
      this.employees = this.deduplicateEmployees(await this.api.getEmployees(deptId).catch(() => []));
      if (entry.employeeId && !this.employees.some(e => e.employeeId === entry.employeeId)) {
        const deptObj = this.departments.find(d => d.id === entry.department);
        this.employees.push({
          departmentId: entry.department,
          departmentName: deptObj?.departmentName || '',
          name: entry.employeeName || '',
          employeeId: entry.employeeId
        });
      }
      this.showAllDepartmentsOption = this.departments.length > 1;
      this.form.patchValue({
        department: entry.department || '',
        employeeId: entry.employeeId,
        dateFrom: entry.dateFrom ? new Date(entry.dateFrom) : null,
        dateTo: entry.dateTo ? new Date(entry.dateTo) : null,
      }, { emitEvent: false });
      this.loadingEmployees = false;
      this.patchingDepartment = false;
    } else {
      // Initial load when not editing
      if (this.departments.length === 1) {
        this.form.controls.department.setValue(this.departments[0].id);
        this.showAllDepartmentsOption = false;
      } else {
        this.form.controls.department.setValue('');
        this.showAllDepartmentsOption = true;
      }
      // Load employee type options for 'All' selection
      await this.loadEmployeeTypeOptions('');
      // Set default Employee Type to All Types
      this.form.controls.employeeType.setValue('');
    }
  }



  /**
   * Loads and deduplicates payment rates for the Employee Type select.
   * If a department is selected, fetches rates for that department.
   * If no department, fetches all departments and deduplicates by label or appliesTo.
   */
  private async loadEmployeeTypeOptions(deptId: string | null) {
    this.paymentRates = [];
    this.employeeTypeOptions = [];
    if (deptId && deptId !== '' && deptId !== 'all') {
      // Find department id (not name) for API
      let departmentId: string | null = null;
      const deptObj = this.departments.find(d => d.departmentName === deptId || d.id === deptId);
      departmentId = deptObj ? deptObj.id : deptId;
      if (departmentId) {
        this.paymentRates = await this.api.getDepartmentPaymentRates(departmentId).catch(() => []);
      }
    } else {
      // No department selected: fetch all departments and aggregate rates
      const allRates: DepartmentPaymentRate[] = [];
      for (const dept of this.departments) {
        const rates = await this.api.getDepartmentPaymentRates(dept.id).catch(() => []);
        allRates.push(...rates);
      }
      // Deduplicate by label (or appliesTo if label is null)
      const seen = new Set<string>();
      for (const rate of allRates) {
        const key = (rate.otherLabel && rate.otherLabel.trim()) ? rate.otherLabel.trim().toLowerCase() : rate.appliesTo;
        if (!seen.has(key)) {
          seen.add(key);
          this.paymentRates.push(rate);
        }
      }
    }
    // Build options: label if present, else appliesTo
    this.employeeTypeOptions = this.paymentRates.map(rate => ({
      label: (rate.otherLabel && rate.otherLabel.trim()) ? rate.otherLabel : this.formatAppliesTo(rate.appliesTo),
      value: rate.id
    }));
  }

  private formatAppliesTo(appliesTo: string): string {
    if (appliesTo === 'standard') return 'Standard';
    if (appliesTo === 'other') return 'Other';
    return appliesTo;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Handles form submission and closes the dialog with selected filters
  run(): void {
    if (this.form.invalid) return;
    const { department, dateFrom, dateTo, employeeId, employeeType } = this.form.value;
    const filters: ReportFilters = {
      department: department || null,
      dateFrom: this.formatDate(dateFrom!),
      dateTo: this.formatDate(dateTo!),
      employeeId: this.form.controls.employeeId.value ?? null,
      employeeType: employeeType || null,
    };
    this.dialogRef.close(filters);
  }

  private firstOfMonth(): Date {
    const d = new Date();
    d.setDate(1);
    return d;
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Deduplicates an employee list by employeeId, keeping the first occurrence. */
  private deduplicateEmployees(employees: DepartmentEmployee[]): DepartmentEmployee[] {
    const seen = new Set<string>();

    return employees.filter(emp => {
      if (seen.has(emp.employeeId)) return false;
      seen.add(emp.employeeId);
      return true;
    });
  }
}
