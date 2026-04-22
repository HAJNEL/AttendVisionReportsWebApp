import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule, MatDateRangeInput, MatDateRangePicker } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../services/dashboard.service';
import type { Department } from '../../../models/department.model';
import type { DepartmentEmployee } from '../../../models/department-user-link.model';
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { from } from 'rxjs';

@Component({
	selector: 'app-employee-leave-dialog',
	templateUrl: './employee-leave-dialog.component.html',
	styleUrls: ['./employee-leave-dialog.component.scss'],
	standalone: true,
	imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinner
]
})
export class EmployeeLeaveDialogComponent implements OnInit {
	form: FormGroup;
	departments: Department[] = [];
	employees: DepartmentEmployee[] = [];
	loadingEmployees = false;
	showAllDepartmentsOption = false;
	readonly leaveTypes = [
		{ value: 'annual', label: 'Annual Leave' },
		{ value: 'sick', label: 'Sick Leave' },
		{ value: 'unpaid', label: 'Unpaid Leave' },
		{ value: 'maternity', label: 'Maternity Leave' },
		{ value: 'paternity', label: 'Paternity Leave' },
		{ value: 'study', label: 'Study Leave' },
		{ value: 'compassionate', label: 'Compassionate Leave' },
		{ value: 'other', label: 'Other' }
	];
	isEditMode = false;

	private patchingDepartment = false;

	constructor(
		private fb: FormBuilder,
		private dialogRef: MatDialogRef<EmployeeLeaveDialogComponent>,
		@Inject(MAT_DIALOG_DATA) public data: any,
		private dashboardService: DashboardService
	) {
		this.form = this.fb.group({
			departmentId: ['all', Validators.required],
			employeeId: ['', Validators.required],
			leaveType: ['', Validators.required],
			fromTime: [null],
			toTime: [null],
			dateRange: this.fb.group({
				start: [null, Validators.required],
				end: [null, Validators.required],
			})
		});

		// Subscribe to department changes to filter employees
		this.form.get('departmentId')!.valueChanges.subscribe(async (deptId: string) => {
			this.loadingEmployees = true;
			const departmentId = deptId && deptId !== 'all' ? deptId : null;
			this.employees = await this.dashboardService.getEmployees(departmentId).catch(() => []);
			if (!this.patchingDepartment) {
				this.form.get('employeeId')!.setValue('');
			}
			this.loadingEmployees = false;
		});
	}

	async ngOnInit(): Promise<void> {
		this.isEditMode = !!this.data?.entry;
		this.departments = await this.dashboardService.getDepartments().catch(() => []);
		console.log('Departments loaded:', this.departments);

		if (this.isEditMode) {
			const entry = this.data.entry;
			console.log('Edit entry:', entry);
			
			this.patchingDepartment = true;
			this.loadingEmployees = true;

			// Load employees for the entry's department specifically
			const deptId = entry.departmentId && entry.departmentId !== 'all' ? entry.departmentId : null;
			this.employees = await this.dashboardService.getEmployees(deptId).catch(() => []);
			
			// Ensure employee is in the list
			if (entry.employeeId && !this.employees.some(e => e.employeeId === entry.employeeId)) {
				const deptObj = this.departments.find(d => d.id === entry.departmentId);
				console.log('Adding missing employee to list:', entry.fullName);
				this.employees.push({
					departmentId: entry.departmentId,
					departmentName: deptObj?.departmentName || '',
					name: entry.fullName,
					employeeId: entry.employeeId
				});
			}

			this.showAllDepartmentsOption = this.departments.length > 1;

			// Patch values without triggering the subscription again

			this.form.patchValue({
				departmentId: entry.departmentId || 'all',
				employeeId: entry.employeeId,
				leaveType: entry.type,
				dateRange: {
					start: entry.fromDate ? new Date(entry.fromDate) : null,
					end: entry.toDate ? new Date(entry.toDate) : null,
				},
				fromTime: entry.fromTime || null,
				toTime: entry.toTime || null,
			}, { emitEvent: false });

			console.log('Form value after patch:', this.form.value);
			this.loadingEmployees = false;
			this.patchingDepartment = false;
		} else {
			// Initial setup for new entry
			if (this.departments.length === 1) {
				this.form.get('departmentId')!.setValue(this.departments[0].id);
				this.showAllDepartmentsOption = false;
			} else {
				this.form.get('departmentId')!.setValue('all');
				this.showAllDepartmentsOption = true;
			}
			
			// The valueChanges subscription (set up in constructor) will handle 
			// the initial employee load based on the setValue calls above.
		}
	}

	get dateRangeControl(): FormControl {
		return this.form.get('dateRange') as FormControl;
	}

	close() { this.dialogRef.close(); }

	save() {
		if (!this.form.valid) return;
		const id = this.data?.entry?.id;
		const formValue = this.form.value;
		const departmentId = formValue.departmentId;
		const employeeId = formValue.employeeId;
		const leaveType = formValue.leaveType;
		// Find employee object for fullName
		const employeeObj = this.employees.find(e => e.employeeId === employeeId);
		const fullName = employeeObj ? employeeObj.name : '';
		// Format dates
		const fromDate = formValue.dateRange?.start ? this.formatDate(formValue.dateRange.start) : undefined;
		const toDate = formValue.dateRange?.end ? this.formatDate(formValue.dateRange.end) : undefined;
		const fromTime = formValue.fromTime;
		const toTime = formValue.toTime;

		const payload = {
			Id: id,
			departmentId,
			employeeId,
			type: leaveType,
			fullName,
			fromDate,
			toDate,
			fromTime,
			toTime
		};
		this.dialogRef.close(payload);
	}

	private formatDate(date: Date): string {
		// yyyy-MM-dd
		const y = date.getFullYear();
		const m = (date.getMonth() + 1).toString().padStart(2, '0');
		const d = date.getDate().toString().padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
}
