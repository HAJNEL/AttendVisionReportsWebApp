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
    department: new FormControl<string | null>(null),
    dateFrom: new FormControl<Date | null>(this.firstOfMonth(), Validators.required),
    dateTo:   new FormControl<Date | null>(new Date(), Validators.required),
    employeeId: new FormControl<string | null>(null),
  });

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
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.config.showDepartment !== false) {
      this.departments = await this.api.getDepartments();
    }

    // Setup department/employee logic to match EmployeeLeaveComponent
    if (this.config.showEmployee !== false) {
      this.form.controls.department.valueChanges
        .pipe(debounceTime(300), takeUntil(this.destroy$))
        .subscribe((deptId: string | null) => {
          (async () => {
            this.loadingEmployees = true;
            // Find department id (not name) for API
            let departmentId: string | null = null;
            if (deptId && deptId !== 'all') {
              // If deptId is a department name, map to id
              const deptObj = this.departments.find(d => d.departmentName === deptId || d.id === deptId);
              departmentId = deptObj ? deptObj.id : deptId;
            }
            this.employees = await this.api.getEmployees(departmentId).catch(() => []);
            // Clear employee selection when department changes (unless patching)
            if (!this.patchingDepartment) {
              this.form.controls.employeeId.setValue('');
            }
            this.form.controls.employeeId.enable();
            this.loadingEmployees = false;
          })();
        });
    } else {
      // If showEmployee is false, disable the employeeId control
      this.form.controls.employeeId.disable();
    }

    // Edit mode logic: patch form and ensure employee is present
    if ((this as any).filters) {
      const entry = (this as any).filters;
      this.patchingDepartment = true;
      this.loadingEmployees = true;
      // Always use department id for API
      const deptId = entry.department && entry.department !== 'all' ? entry.department : null;
      this.employees = await this.api.getEmployees(deptId).catch(() => []);
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
        department: entry.department || 'all',
        employeeId: entry.employeeId,
        dateFrom: entry.dateFrom ? new Date(entry.dateFrom) : null,
        dateTo: entry.dateTo ? new Date(entry.dateTo) : null,
      }, { emitEvent: false });
      this.loadingEmployees = false;
      this.patchingDepartment = false;
    } else {
      // Initial department/employee setup
      if (this.departments.length === 1) {
        this.form.controls.department.setValue(this.departments[0].id);
        this.showAllDepartmentsOption = false;
      } else {
        this.form.controls.department.setValue('all');
        this.showAllDepartmentsOption = true;
      }
      // Initial employee load (no department filter)
      this.loadingEmployees = true;
      this.employees = await this.api.getEmployees(null).catch(() => []);
      this.loadingEmployees = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Removed loadUsers, replaced by department valueChanges logic

  run(): void {
    if (this.form.invalid) return;
    const { department, dateFrom, dateTo, employeeId } = this.form.value;
    const filters: ReportFilters = {
      department: department ?? null,
      dateFrom:   this.formatDate(dateFrom!),
      dateTo:     this.formatDate(dateTo!),
      employeeId: employeeId ?? null,
    };
    this.dialogRef.close(filters);
  }

  private firstOfMonth(): Date {
    const d = new Date();
    d.setDate(1);
    return d;
  }

  private formatDate(d: Date): string {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
