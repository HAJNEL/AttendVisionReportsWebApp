import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface AddRecordDialogData {
  existingRecord?: { id: number; time: string; attendanceStatus: string | null };
}

export interface AddRecordDialogResult {
  time: string;
  attendanceStatus: string;
}

const STATUS_OPTIONS = [
  { value: 'check_in',    label: 'Check In'   },
  { value: 'check_out',   label: 'Check Out'  },
  { value: 'break_out',   label: 'Break Out'  },
  { value: 'break_in',    label: 'Break In'   },
];

@Component({
  selector: 'app-add-record-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.existingRecord ? 'Edit Record' : 'Add Access Record' }}</h2>
    <mat-dialog-content>
      <div class="form-row">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Attendance Status</mat-label>
          <mat-select [(ngModel)]="status" [disabled]="!!data.existingRecord">
            <mat-option *ngFor="let s of statusOptions" [value]="s.value">{{ s.label }}</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <div class="form-row">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Time (HH:mm)</mat-label>
          <input matInput type="time" [(ngModel)]="time" step="60">
          <mat-hint>24-hour format</mat-hint>
        </mat-form-field>
      </div>
      <div *ngIf="validationError" class="validation-error">
        <mat-icon>error_outline</mat-icon> {{ validationError }}
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-flat-button color="primary" (click)="confirm()" [disabled]="!status || !time">
        {{ data.existingRecord ? 'Save' : 'Add' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 320px; padding-top: 8px; }
    .form-row { margin-bottom: 8px; }
    .full-width { width: 100%; }
    .validation-error {
      display: flex; align-items: center; gap: 6px;
      color: #f85149; font-size: 13px; margin-top: 4px;
    }
  `],
})
export class AddRecordDialogComponent {
  statusOptions = STATUS_OPTIONS;
  status = '';
  time = '';
  validationError: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<AddRecordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddRecordDialogData,
  ) {
    if (data.existingRecord) {
      this.status = data.existingRecord.attendanceStatus ?? '';
      this.time = data.existingRecord.time;
    }
  }

  confirm(): void {
    if (!this.status || !this.time) {
      this.validationError = 'Please fill in all fields.';
      return;
    }
    this.dialogRef.close({ time: this.time, attendanceStatus: this.status } as AddRecordDialogResult);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
