import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { Company } from '../../models/company.model';

export interface DepartmentRow {
  id: number;
  departmentName: string;
  manager: string | null;
  paymentRate: number | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  serialNo?: string | null;
  companyId?: string | null;
}

export interface DeptFormDialogData {
  dept: DepartmentRow | null;
}

// ─── Create / Edit form dialog ───────────────────────────────────────────────

import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dept-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Department' : 'Create Department' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dept-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Serial Number</mat-label>
          <input matInput formControlName="serialNo" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Company</mat-label>
          <mat-select formControlName="companyId">
            <mat-option [value]="null">None</mat-option>
            <mat-option *ngFor="let c of companies" [value]="c.id">{{ c.name }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Department Name</mat-label>
          <input matInput formControlName="departmentName" required />
          <mat-error *ngIf="form.get('departmentName')?.hasError('required')">Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Manager</mat-label>
          <input matInput formControlName="manager" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="half-width">
          <mat-label>Payment Rate (hourly)</mat-label>
          <input matInput type="number" step="0.01" min="0" formControlName="paymentRate" />
          <span matTextPrefix>R&nbsp;</span>
        </mat-form-field>

        <mat-divider class="section-divider"></mat-divider>
        <p class="section-label">Address</p>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Address Line 1</mat-label>
          <input matInput formControlName="address_line1" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Address Line 2</mat-label>
          <input matInput formControlName="address_line2" />
        </mat-form-field>

        <div class="row-fields">
          <mat-form-field appearance="outline" class="city-field">
            <mat-label>City</mat-label>
            <input matInput formControlName="city" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="state-field">
            <mat-label>State / Province</mat-label>
            <input matInput formControlName="state" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="zip-field">
            <mat-label>Postal Code</mat-label>
            <input matInput formControlName="postal_code" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Country</mat-label>
          <input matInput formControlName="country" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid">
        {{ isEdit ? 'Save Changes' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dept-form { display: flex; flex-direction: column; gap: 4px; min-width: 480px; padding-top: 8px; }
    .full-width  { width: 100%; }
    .half-width  { width: 50%; }
    .section-divider { margin: 8px 0 4px; }
    .section-label { font-size: 12px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px; }
    .row-fields { display: flex; gap: 12px; }
    .city-field  { flex: 2; }
    .state-field { flex: 2; }
    .zip-field   { flex: 1; }
  `],
})
export class DeptFormDialogComponent implements OnInit {
  isEdit: boolean;
  form: FormGroup;
  companies: Company[] = [];

  constructor(
    public dialogRef: MatDialogRef<DeptFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeptFormDialogData,
    private api: ApiService,
  ) {
    this.isEdit = data.dept !== null;
    const d = data.dept;
    this.form = new FormGroup({
      departmentName: new FormControl(d?.departmentName ?? '', Validators.required),
      manager:         new FormControl(d?.manager ?? ''),
      paymentRate:    new FormControl(d?.paymentRate ?? null),
      address_line1:   new FormControl(d?.address_line1 ?? ''),
      address_line2:   new FormControl(d?.address_line2 ?? ''),
      city:            new FormControl(d?.city ?? ''),
      state:           new FormControl(d?.state ?? ''),
      postalCode:      new FormControl(d?.postalCode ?? ''),
      country:         new FormControl(d?.country ?? ''),
      serialNo:        new FormControl(d?.serialNo ?? ''),
      companyId:       new FormControl(d?.companyId ?? null),
    });
  }

  async ngOnInit(): Promise<void> {
    this.companies = await this.api.getCompanies().catch(() => []);
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    // Convert empty strings → null for optional fields
    this.dialogRef.close({
      departmentName: v.departmentName,
      manager:        v.manager || null,
      paymentRate:   v.paymentRate !== '' && v.paymentRate !== null ? Number(v.paymentRate) : null,
      addressLine1:   v.address_line1 || null,
      addressLine2:   v.address_line2 || null,
      city:           v.city || null,
      state:          v.state || null,
      postalCode:     v.postalCode || null,
      country:        v.country || null,
      serialNo:       v.serialNo || null,
      companyId:      v.companyId || null,
    });
  }
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

export interface DeptConfirmDialogData {
  name: string;
}

@Component({
  selector: 'app-dept-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Delete Department</h2>
    <mat-dialog-content>
      <p>Are you sure you want to delete <strong>{{ data.name }}</strong>?</p>
      <p style="color:#8b949e;font-size:13px;">This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">Cancel</button>
      <button mat-flat-button color="warn" (click)="dialogRef.close(true)">Delete</button>
    </mat-dialog-actions>
  `,
})
export class DeptConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DeptConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeptConfirmDialogData,
  ) {}
}
