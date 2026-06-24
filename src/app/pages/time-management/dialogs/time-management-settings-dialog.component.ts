import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../services/api.service';
import { TimeManagementConfig } from '../../../models/time-management.model';

export interface TimeManagementSettingsDialogData {
  config: TimeManagementConfig;
}

@Component({
  selector: 'app-time-management-settings-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule,
    MatIconModule, MatDividerModule, MatSlideToggleModule, MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">settings</mat-icon>
      Time Management Rules
    </h2>

    <mat-dialog-content>
      <p class="subtitle">
        Configure which issues are detected and how auto-fix suggests corrections.
        These settings apply to your whole company.
      </p>

      <!-- Detection toggles -->
      <section class="section">
        <h3 class="section-title"><mat-icon>rule</mat-icon> Detection Rules</h3>

        <div class="rule-row">
          <div class="rule-info">
            <div class="rule-name">Missing check-in</div>
            <div class="rule-desc">Flag days with no check-in record.</div>
          </div>
          <mat-slide-toggle [(ngModel)]="config.detectMissingCheckIn" color="primary"></mat-slide-toggle>
        </div>

        <div class="rule-row">
          <div class="rule-info">
            <div class="rule-name">Missing check-out</div>
            <div class="rule-desc">Flag days with no check-out record.</div>
          </div>
          <mat-slide-toggle [(ngModel)]="config.detectMissingCheckOut" color="primary"></mat-slide-toggle>
        </div>

        <div class="rule-row">
          <div class="rule-info">
            <div class="rule-name">Unbalanced breaks</div>
            <div class="rule-desc">Flag a break-out without a matching break-in (or vice-versa).</div>
          </div>
          <mat-slide-toggle [(ngModel)]="config.detectMissingBreak" color="primary"></mat-slide-toggle>
        </div>

        <div class="rule-row">
          <div class="rule-info">
            <div class="rule-name">Duplicate clockings</div>
            <div class="rule-desc">Flag consecutive identical clockings and propose removing the wrong one.</div>
          </div>
          <mat-slide-toggle [(ngModel)]="config.detectDuplicates" color="primary"></mat-slide-toggle>
        </div>
      </section>

      <mat-divider></mat-divider>

      <!-- Parameters -->
      <section class="section">
        <h3 class="section-title"><mat-icon>tune</mat-icon> Auto-fix Parameters</h3>

        <div class="param-row">
          <label for="workdayHours">Standard workday length (hours)</label>
          <input id="workdayHours" type="number" min="1" max="24" step="0.5"
            [(ngModel)]="config.workdayHours" class="num-input">
        </div>
        <div class="param-hint">Default check-out time = check-in + this many hours.</div>

        <div class="rule-row">
          <div class="rule-info">
            <div class="rule-name">Detect double shifts</div>
            <div class="rule-desc">If there is activity past the workday length, use the double-shift length instead.</div>
          </div>
          <mat-slide-toggle [(ngModel)]="config.enableDoubleShift" color="primary"></mat-slide-toggle>
        </div>

        <div class="param-row" [class.param-disabled]="!config.enableDoubleShift">
          <label for="doubleShiftHours">Double shift length (hours)</label>
          <input id="doubleShiftHours" type="number" min="1" max="24" step="0.5"
            [(ngModel)]="config.doubleShiftHours" [disabled]="!config.enableDoubleShift" class="num-input">
        </div>

        <div class="param-row">
          <label for="breakMinutes">Default break length (minutes)</label>
          <input id="breakMinutes" type="number" min="1" max="240" step="5"
            [(ngModel)]="config.breakDefaultMinutes" class="num-input">
        </div>

        <div class="param-row">
          <label for="checkInOffset">Check-in offset (minutes before first event)</label>
          <input id="checkInOffset" type="number" min="0" max="120" step="1"
            [(ngModel)]="config.checkInOffsetMinutes" class="num-input">
        </div>

        <div class="param-row">
          <label for="checkOutOffset">Check-out fallback offset (minutes after last event)</label>
          <input id="checkOutOffset" type="number" min="0" max="120" step="1"
            [(ngModel)]="config.checkOutOffsetMinutes" class="num-input">
        </div>
        <div class="param-hint">Used only when there is no check-in to anchor the workday length.</div>
      </section>

      <mat-divider></mat-divider>

      <!-- Duplicate strategy -->
      <section class="section" [class.section-disabled]="!config.detectDuplicates">
        <h3 class="section-title"><mat-icon>content_copy</mat-icon> Duplicate Removal</h3>
        <div class="param-row">
          <label for="dupStrategy">When two identical clockings exist</label>
          <select id="dupStrategy" [(ngModel)]="config.duplicateKeepStrategy"
            [disabled]="!config.detectDuplicates" class="select-input">
            <option value="remove_failed_then_second">Remove failed auth first, else the second</option>
            <option value="always_second">Always remove the second one</option>
          </select>
        </div>
      </section>
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
    mat-dialog-content { min-width: 460px; max-width: 560px; max-height: 72vh; }
    .subtitle { color: #8b949e; font-size: 13px; margin: 4px 0 12px; }
    .section { padding: 14px 0; }
    .section-disabled { opacity: 0.5; }
    .section-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.05em; color: #8b949e; margin: 0 0 12px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .rule-row {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 8px 0;
    }
    .rule-info { flex: 1; }
    .rule-name { font-size: 14px; color: #c9d1d9; }
    .rule-desc { font-size: 12px; color: #8b949e; margin-top: 2px; }
    .param-row {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 8px 0;
      label { font-size: 14px; color: #c9d1d9; flex: 1; }
    }
    .param-disabled { opacity: 0.5; }
    .param-hint { font-size: 12px; color: #8b949e; margin: -4px 0 8px; }
    .num-input, .select-input {
      background: #161b22; border: 1px solid #30363d; border-radius: 6px;
      color: #c9d1d9; font-size: 13px; padding: 6px 8px; outline: none;
      &:focus { border-color: #58a6ff; }
      &:disabled { opacity: 0.45; cursor: not-allowed; }
    }
    .num-input { width: 90px; text-align: right; }
    .select-input { min-width: 220px; }
    .btn-spinner { display: inline-block; margin-right: 6px; }
    mat-divider { border-top-color: #30363d !important; }
  `],
})
export class TimeManagementSettingsDialogComponent {
  config: TimeManagementConfig;
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<TimeManagementSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TimeManagementSettingsDialogData,
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
      const saved = await this.api.saveTimeManagementConfig(this.normalized());
      this.snackBar.open('Settings saved.', 'OK', { duration: 2500 });
      this.dialogRef.close(saved);
    } catch (e: any) {
      this.snackBar.open(e?.error?.error || e?.message || 'Failed to save settings.', 'Dismiss', { duration: 4000 });
      this.saving = false;
    }
  }

  private normalized(): TimeManagementConfig {
    const c = this.config;
    const num = (v: any, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    return {
      ...c,
      workdayHours: num(c.workdayHours, 8),
      doubleShiftHours: num(c.doubleShiftHours, 16),
      breakDefaultMinutes: Math.round(num(c.breakDefaultMinutes, 30)),
      checkInOffsetMinutes: Math.round(num(c.checkInOffsetMinutes, 8)),
      checkOutOffsetMinutes: Math.round(num(c.checkOutOffsetMinutes, 8)),
    };
  }
}
