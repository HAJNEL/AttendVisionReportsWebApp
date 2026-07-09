import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../services/api.service';
import { ReportConfigSettings } from '../../../models/reports.model';

export interface ReportSettingsDialogData {
  config: ReportConfigSettings;
}

@Component({
  selector: 'app-report-settings-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">settings</mat-icon>
      Report Settings
    </h2>

    <mat-dialog-content>
      <p class="subtitle">
        Define your company's reporting period. Once set, reports can use a
        one-click toggle to select the current period's date range.
        These settings apply to your whole company.
      </p>

      <div class="param-row">
        <label for="monthStartDay">Month start day</label>
        <input id="monthStartDay" type="number" min="1" max="31" step="1"
          [(ngModel)]="config.monthStartDay" class="num-input">
      </div>
      <div class="param-hint">Day of the previous month the period starts on.</div>

      <div class="param-row">
        <label for="monthEndDay">Month end day</label>
        <input id="monthEndDay" type="number" min="1" max="31" step="1"
          [(ngModel)]="config.monthEndDay" class="num-input">
      </div>
      <div class="param-hint">Day of the current month the period ends on.</div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()" [disabled]="saving">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="saving">
        @if (saving) {
          <mat-spinner diameter="18" class="btn-spinner"></mat-spinner>
        } @else {
          <mat-icon>save</mat-icon>
        }
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex; align-items: center; gap: 8px;
      .title-icon { color: #58a6ff; }
    }
    mat-dialog-content { min-width: 380px; max-width: 440px; }
    .subtitle { color: #8b949e; font-size: 13px; margin: 4px 0 16px; }
    .param-row {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 8px 0;
      label { font-size: 14px; color: #c9d1d9; flex: 1; }
    }
    .param-hint { font-size: 12px; color: #8b949e; margin: -4px 0 8px; }
    .num-input {
      background: #161b22; border: 1px solid #30363d; border-radius: 6px;
      color: #c9d1d9; font-size: 13px; padding: 6px 8px; outline: none;
      width: 90px; text-align: right;
      &:focus { border-color: #58a6ff; }
    }
    .btn-spinner { display: inline-block; margin-right: 6px; }
  `],
})
export class ReportSettingsDialogComponent {
  config: ReportConfigSettings;
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<ReportSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReportSettingsDialogData,
    private api: ApiService,
    private snackBar: MatSnackBar,
  ) {
    // work on a copy so Cancel discards changes
    this.config = { ...data.config };
  }

  cancel(): void { this.dialogRef.close(null); }

  async save(): Promise<void> {
    this.saving = true;
    try {
      const saved = await this.api.saveReportConfig(this.normalized());
      this.snackBar.open('Settings saved.', 'OK', { duration: 2500 });
      this.dialogRef.close(saved);
    } catch (e: any) {
      this.snackBar.open(e?.error?.error || e?.message || 'Failed to save settings.', 'Dismiss', { duration: 4000 });
      this.saving = false;
    }
  }

  private normalized(): ReportConfigSettings {
    const c = this.config;
    const clampDay = (v: any): number | null => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 1) return null;
      return Math.min(Math.round(n), 31);
    };
    return {
      ...c,
      monthStartDay: clampDay(c.monthStartDay),
      monthEndDay: clampDay(c.monthEndDay),
    };
  }
}
