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

/** Configuration passed via MAT_DIALOG_DATA when opening this dialog. */
export interface DynamicFilterConfig {
  /** Dialog title, e.g. "Timesheet Report — Parameters" */
  title: string;
  /** Show the department dropdown. Defaults to true. */
  showDepartment?: boolean;
  /** Show the date-range pickers. Defaults to true. */
  showDateRange?: boolean;
  /** Show the user dropdown. Defaults to true. */
  showUser?: boolean;
}

/** The value this dialog closes with on Run. */
export interface ReportFilters {
  department: string | null;
  dateFrom: string;
  dateTo: string;
  user: string | null;
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
    user:     new FormControl<string | null>(null),
  });

  departments: DepartmentOption[] = [];
  users: string[] = [];
  loadingUsers = false;

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

    if (this.config.showUser !== false) {
      this.form.controls.department.valueChanges
        .pipe(debounceTime(300), takeUntil(this.destroy$))
        .subscribe(() => this.loadUsers());

      this.form.controls.dateFrom.valueChanges
        .pipe(debounceTime(400), takeUntil(this.destroy$))
        .subscribe(() => this.loadUsers());

      this.form.controls.dateTo.valueChanges
        .pipe(debounceTime(400), takeUntil(this.destroy$))
        .subscribe(() => this.loadUsers());

      await this.loadUsers();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadUsers(): Promise<void> {
    const { department, dateFrom, dateTo } = this.form.value;
    if (!dateFrom || !dateTo) {
      this.users = [];
      return;
    }
    this.loadingUsers = true;
    this.form.controls.user.setValue(null, { emitEvent: false });
    try {
      this.users = await this.api.getTimesheetUsers(
        department ?? null,
        this.formatDate(dateFrom),
        this.formatDate(dateTo),
      );
    } catch {
      this.users = [];
    } finally {
      this.loadingUsers = false;
    }
  }

  run(): void {
    if (this.form.invalid) return;
    const { department, dateFrom, dateTo, user } = this.form.value;
    const filters: ReportFilters = {
      department: department ?? null,
      dateFrom:   this.formatDate(dateFrom!),
      dateTo:     this.formatDate(dateTo!),
      user:       user ?? null,
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
