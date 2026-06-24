import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AutoFixPreviewResponse, AutoFixAction, AccessRecordDto, TimeManagementConfig } from '../../../models/time-management.model';

export interface AutoFixConfirmDialogData {
  preview: AutoFixPreviewResponse;
  personName: string;
  date: string;
  records: AccessRecordDto[];
  config?: TimeManagementConfig | null;
}

const DEFAULT_CONFIG: TimeManagementConfig = {
  companyId: null,
  detectMissingCheckIn: true,
  detectMissingCheckOut: true,
  detectMissingBreak: true,
  detectDuplicates: true,
  enableDoubleShift: true,
  workdayHours: 8,
  doubleShiftHours: 16,
  breakDefaultMinutes: 30,
  checkInOffsetMinutes: 8,
  checkOutOffsetMinutes: 8,
  duplicateKeepStrategy: 'remove_failed_then_second',
};

const ISSUE_ICONS: Record<string, string> = {
  missing_check_in:      'login',
  missing_check_out:     'logout',
  missing_break_in:      'coffee',
  missing_break_out:     'free_breakfast',
  duplicate_consecutive: 'content_copy',
};

const STATUS_OPTIONS = [
  { value: 'check_in',     label: 'Check In'   },
  { value: 'check_out',    label: 'Check Out'  },
  { value: 'break_out',    label: 'Break Out'  },
  { value: 'break_in',     label: 'Break In'   }
];

const DUPLICATE_STATUSES = new Set(['check_in', 'check_out', 'break_out', 'break_in']);

@Component({
  selector: 'app-auto-fix-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">auto_fix_high</mat-icon>
      Auto Fix — {{ data.personName }} on {{ data.date }}
    </h2>

    <mat-dialog-content>
      <section class="section">
        <h3 class="section-title">
          <mat-icon>warning_amber</mat-icon> Detected Issues
        </h3>
        @for (issue of data.preview.issues; track issue.issueType) {
          <div class="issue-item">
            <mat-icon class="issue-icon">{{ issueIcon(issue.issueType) }}</mat-icon>
            <div>
              <div class="issue-desc">{{ issue.description }}</div>
              @if (issue.relatedTime) {
                <div class="issue-time">Related time: {{ issue.relatedTime }}</div>
              }
            </div>
          </div>
        }
      </section>

      <mat-divider></mat-divider>

      @if (editableActions.length > 0) {
        <section class="section">
          <h3 class="section-title">
            <mat-icon>build</mat-icon> Proposed Fixes
          </h3>
          @for (action of editableActions; track $index) {
            <div class="action-item"
              [class.action-item--delete]="isDelete(action)"
              [class.action-item--unchecked]="!selected[$index]">
              <mat-checkbox [(ngModel)]="selected[$index]" class="action-checkbox" color="primary"></mat-checkbox>
              <mat-icon class="action-icon">{{ isDelete(action) ? 'remove_circle_outline' : 'add_circle_outline' }}</mat-icon>
              <div class="action-body">
                @if (!isDelete(action)) {
                  <div class="action-inputs">
                    @if (action.attendanceStatus !== null) {
                      <select [(ngModel)]="action.attendanceStatus" class="status-select" title="Status" aria-label="Status"
                        [disabled]="!selected[$index]">
                        @for (s of statusOptions; track s.value) {
                          <option [value]="s.value">{{ s.label }}</option>
                        }
                      </select>
                    }
                    @if (action.attendanceStatus !== null && action.time !== null) {
                      <span class="at-label">at</span>
                    }
                    @if (action.time !== null) {
                      <input type="time" [(ngModel)]="action.time" class="time-input" step="60" title="Time" aria-label="Time"
                        [disabled]="!selected[$index]">
                    }
                  </div>
                } @else {
                  <div class="delete-summary">
                    <span class="delete-status-chip">{{ statusLabel(action.attendanceStatus) }}</span>
                    @if (action.time) {
                      <span class="at-label">at</span>
                      <span class="delete-time">{{ action.time }}</span>
                    }
                  </div>
                }
                <div class="action-desc">{{ action.description }}</div>
              </div>
            </div>
          }
        </section>
      } @else {
        <div class="no-actions">
          <mat-icon>info_outline</mat-icon>
          No automatic fixes are available. Please correct the records manually.
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button
        mat-flat-button color="primary"
        (click)="confirm()"
        [disabled]="!anySelected">
        <mat-icon>auto_fix_high</mat-icon>
        Apply Fixes
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex; align-items: center; gap: 8px;
      .title-icon { color: #58a6ff; }
    }
    mat-dialog-content { min-width: 480px; max-width: 600px; max-height: 70vh; overflow-y: auto; }
    .section { padding: 16px 0; }
    .section-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.05em; color: #8b949e; margin: 0 0 12px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .issue-item, .action-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 10px 12px; border-radius: 6px; margin-bottom: 8px;
      transition: opacity 0.15s ease, background 0.15s ease;
    }
    .issue-item {
      background: rgba(210, 153, 34, 0.08);
      border: 1px solid rgba(210, 153, 34, 0.2);
      .issue-icon { color: #d29922; flex-shrink: 0; }
      .issue-desc { font-size: 14px; color: #c9d1d9; }
      .issue-time { font-size: 12px; color: #8b949e; margin-top: 2px; font-family: monospace; }
    }
    .action-item {
      background: rgba(63, 185, 80, 0.06);
      border: 1px solid rgba(63, 185, 80, 0.2);
      .action-checkbox { flex-shrink: 0; margin-top: 2px; }
      .action-icon { color: #3fb950; flex-shrink: 0; }
      .action-body { display: flex; flex-direction: column; gap: 6px; flex: 1; }
      .action-inputs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .action-desc { font-size: 12px; color: #8b949e; }
    }
    .action-item--delete {
      background: rgba(248, 81, 73, 0.06);
      border-color: rgba(248, 81, 73, 0.25);
      .action-icon { color: #f85149; }
    }
    .action-item--unchecked {
      background: rgba(139, 148, 158, 0.04);
      border-color: rgba(139, 148, 158, 0.15);
      opacity: 0.55;
      .action-icon { color: #8b949e; }
    }
    .delete-summary {
      display: flex; align-items: center; gap: 6px;
    }
    .delete-status-chip {
      display: inline-block; padding: 1px 8px; border-radius: 10px;
      background: rgba(248, 81, 73, 0.15); color: #f85149;
      font-size: 12px; font-weight: 600;
    }
    .delete-time { font-family: monospace; font-size: 13px; color: #c9d1d9; }
    .at-label { font-size: 13px; color: #8b949e; }
    .status-select, .time-input {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #c9d1d9;
      font-size: 13px;
      padding: 4px 8px;
      outline: none;
      cursor: pointer;
      &:focus { border-color: #58a6ff; }
      &:disabled { opacity: 0.45; cursor: not-allowed; }
    }
    .status-select { min-width: 120px; }
    .time-input { font-family: monospace; width: 110px; }
    .no-actions {
      display: flex; align-items: center; gap: 8px; padding: 16px;
      color: #8b949e; font-size: 14px;
      background: rgba(139, 148, 158, 0.08); border-radius: 6px;
      mat-icon { flex-shrink: 0; }
    }
    mat-divider { border-top-color: #30363d !important; }
  `],
})
export class AutoFixConfirmDialogComponent {
  readonly statusOptions = STATUS_OPTIONS;
  readonly config: TimeManagementConfig;
  editableActions: AutoFixAction[];
  selected: boolean[];

  get anySelected(): boolean {
    return this.selected.some(v => v);
  }

  constructor(
    public dialogRef: MatDialogRef<AutoFixConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AutoFixConfirmDialogData,
  ) {
    this.config = data.config ?? DEFAULT_CONFIG;

    const apiActions = data.preview.proposedActions
      .map(a => ({ ...a }))
      .map(a => this.applyDefaultTime(a, data.records));

    const duplicateActions = this.generateDuplicateActions(data.preview, data.records);

    const existingDeleteIds = new Set(
      apiActions.filter(a => a.actionType === 'delete' && a.recordId != null).map(a => a.recordId),
    );
    const newDuplicateActions = duplicateActions.filter(a => !existingDeleteIds.has(a.recordId));

    this.editableActions = [...apiActions, ...newDuplicateActions];
    this.selected = this.editableActions.map(() => true);
  }

  isDelete(action: AutoFixAction): boolean {
    return action.actionType?.toLowerCase() === 'delete';
  }

  issueIcon(type: string): string {
    return ISSUE_ICONS[type] ?? 'error_outline';
  }

  statusLabel(status: string | null): string {
    return STATUS_OPTIONS.find(s => s.value === status?.toLowerCase())?.label ?? status ?? '—';
  }

  confirm(): void {
    const actions = this.editableActions.filter((_, i) => this.selected[i]);
    this.dialogRef.close(actions);
  }

  cancel(): void { this.dialogRef.close(null); }

  private generateDuplicateActions(preview: AutoFixPreviewResponse, records: AccessRecordDto[]): AutoFixAction[] {
    if (!this.config.detectDuplicates) return [];
    const hasDuplicateIssue = preview.issues.some(i => i.issueType === 'duplicate_consecutive');
    if (!hasDuplicateIssue) return [];

    const sorted = [...records].sort((a, b) => a.time.localeCompare(b.time));
    const actions: AutoFixAction[] = [];
    const markedForDeletion = new Set<number>();

    for (let i = 0; i < sorted.length - 1; i++) {
      const r1 = sorted[i];
      const r2 = sorted[i + 1];

      if (markedForDeletion.has(r1.id)) continue;

      const s1 = r1.attendanceStatus?.toLowerCase() ?? '';
      const s2 = r2.attendanceStatus?.toLowerCase() ?? '';
      if (s1 !== s2 || !DUPLICATE_STATUSES.has(s1)) continue;

      const toRemove = this.pickDuplicate(r1, r2);
      markedForDeletion.add(toRemove.id);

      const label = this.statusLabel(toRemove.attendanceStatus);
      const reason = toRemove.failed || this.isAuthFailed(toRemove)
        ? 'failed authentication'
        : 'duplicate entry';

      actions.push({
        actionType: 'delete',
        recordId: toRemove.id,
        attendanceStatus: toRemove.attendanceStatus,
        time: toRemove.time,
        description: `Remove ${label} at ${toRemove.time} (${reason})`,
      });
    }

    return actions;
  }

  private pickDuplicate(r1: AccessRecordDto, r2: AccessRecordDto): AccessRecordDto {
    if (this.config.duplicateKeepStrategy === 'always_second') return r2;
    const wrong1 = r1.failed === true || this.isAuthFailed(r1);
    const wrong2 = r2.failed === true || this.isAuthFailed(r2);
    if (wrong1 && !wrong2) return r1;
    if (wrong2 && !wrong1) return r2;
    return r2; // both correct or both wrong — remove the second
  }

  private isAuthFailed(r: AccessRecordDto): boolean {
    return r.authenticationResult != null && r.authenticationResult.toLowerCase() !== 'success';
  }

  private applyDefaultTime(action: AutoFixAction, records: AccessRecordDto[]): AutoFixAction {
    const recordTime = (status: string) =>
      records.find(r => r.attendanceStatus?.toLowerCase() === status)?.time ?? null;

    const workdayMins = Math.round(this.config.workdayHours * 60);
    const doubleShiftMins = Math.round(this.config.doubleShiftHours * 60);
    const breakMins = this.config.breakDefaultMinutes;

    if (action.attendanceStatus === 'check_out') {
      const checkIn = recordTime('check_in');
      if (checkIn) {
        const checkInMins = this.timeToMinutes(checkIn);
        const hasActivityAfterWorkday = this.config.enableDoubleShift && records.some(r =>
          r.attendanceStatus?.toLowerCase() !== 'check_in' &&
          r.time != null &&
          this.timeToMinutes(r.time) > checkInMins + workdayMins,
        );
        return { ...action, time: this.shiftTime(checkIn, hasActivityAfterWorkday ? doubleShiftMins : workdayMins) };
      }
    } else if (action.attendanceStatus === 'break_in' && action.time === null) {
      const breakOut = recordTime('break_out');
      if (breakOut) return { ...action, time: this.shiftTime(breakOut, breakMins) };
    } else if (action.attendanceStatus === 'break_out' && action.time === null) {
      const breakIn = recordTime('break_in');
      if (breakIn) return { ...action, time: this.shiftTime(breakIn, -breakMins) };
    }

    return action;
  }

  private timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  private shiftTime(timeStr: string, minutes: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const clamped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    return `${Math.floor(clamped / 60).toString().padStart(2, '0')}:${(clamped % 60).toString().padStart(2, '0')}`;
  }
}
