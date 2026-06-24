import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../../services/api.service';
import {
  AccessRecordDto,
  TimeManagementIssue,
  AutoFixApplyRequest,
  AutoFixAction,
  UpdateAccessRecordDto,
} from '../../../models/time-management.model';
import { AddRecordDialogComponent, AddRecordDialogResult } from '../dialogs/add-record-dialog.component';
import { AutoFixConfirmDialogComponent } from '../dialogs/auto-fix-confirm-dialog.component';
import { DynamicDialogComponent, DynamicDialogConfig } from '../../../shared/components/dynamic-dialog/dynamic-dialog.component';

const STATUS_DEFS: Record<string, { label: string; color: string }> = {
  check_in:     { label: 'Check In',   color: '#3fb950' },
  check_out:    { label: 'Check Out',  color: '#58a6ff' },
  break_out:    { label: 'Break Out',  color: '#d29922' },
  break_in:     { label: 'Break In',   color: '#a371f7' },
  overtime_in:  { label: 'OT In',      color: '#f0883e' },
  overtime_out: { label: 'OT Out',     color: '#f85149' },
};

const ISSUE_ICONS: Record<string, string> = {
  missing_check_in:      'login',
  missing_check_out:     'logout',
  missing_break_in:      'coffee',
  missing_break_out:     'free_breakfast',
  duplicate_consecutive: 'content_copy',
};

@Component({
  selector: 'app-time-management-detail',
  standalone: true,
  templateUrl: './time-management-detail.component.html',
  styleUrls: ['./time-management-detail.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatChipsModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
})
export class TimeManagementDetailComponent implements OnInit {
  employeeId = '';
  date = '';
  personName = '';
  department = '';

  private savedFilter: { deptId: string; employeeId: string; date: string } | null = null;

  loading = false;
  savingId: number | null = null;
  deletingId: number | null = null;
  fixingAuto = false;
  error: string | null = null;

  records: AccessRecordDto[] = [];
  issues: TimeManagementIssue[] = [];
  editingId: number | null = null;
  editTime = '';
  editStatus = '';

  readonly statusOptions = [
    { value: 'check_in',    label: 'Check In'   },
    { value: 'check_out',   label: 'Check Out'  },
    { value: 'break_out',   label: 'Break Out'  },
    { value: 'break_in',    label: 'Break In'   },
    { value: 'overtime_in',  label: 'OT In'     },
    { value: 'overtime_out', label: 'OT Out'    },
  ];

  displayedColumns = ['time', 'status', 'authResult', 'actions'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  async ngOnInit(): Promise<void> {
    this.savedFilter = history.state?.savedFilter ?? null;
    this.employeeId = this.route.snapshot.paramMap.get('employeeId') ?? '';
    this.date       = this.route.snapshot.paramMap.get('date') ?? '';
    await this.loadAll();
  }

  async loadAll(): Promise<void> {
    if (!this.employeeId || !this.date) return;
    this.loading = true;
    this.error = null;
    try {
      const [records, issues] = await Promise.all([
        this.api.getTimeManagementUserRecords(this.date, this.employeeId),
        this.api.getTimeManagementUserIssues(this.date, this.employeeId),
      ]);
      this.records = records;
      this.issues  = issues;
      if (records.length > 0) {
        this.personName  = records[0].personName;
        this.department  = records[0].department;
      }
    } catch (e: any) {
      this.error = e.message || 'Failed to load records.';
    } finally {
      this.loading = false;
    }
  }

  // ── Inline time edit ──────────────────────────────────────────────────────

  startEdit(record: AccessRecordDto): void {
    this.editingId  = record.id;
    this.editTime   = record.time;
    this.editStatus = record.attendanceStatus ?? '';
  }

  cancelEdit(): void {
    this.editingId  = null;
    this.editTime   = '';
    this.editStatus = '';
  }

  async saveEdit(record: AccessRecordDto): Promise<void> {
    if (!this.editTime || !this.editStatus) return;
    this.savingId = record.id;
    try {
      const dto: UpdateAccessRecordDto = { time: this.editTime, attendanceStatus: this.editStatus };
      await this.api.updateAccessRecord(record.id, dto);
      this.snackBar.open('Record updated.', 'OK', { duration: 2500 });
      this.editingId = null;
      await this.loadAll();
    } catch (e: any) {
      this.snackBar.open(e.message || 'Failed to update record.', 'Dismiss', { duration: 4000 });
    } finally {
      this.savingId = null;
    }
  }

  // ── Add record ────────────────────────────────────────────────────────────

  openAddRecord(): void {
    const ref = this.dialog.open(AddRecordDialogComponent, {
      width: '400px',
      data: {},
    });
    ref.afterClosed().subscribe(async (result: AddRecordDialogResult | undefined) => {
      if (!result) return;
      try {
        await this.api.createAccessRecord({
          employeeId:       this.employeeId,
          personName:       this.personName,
          department:       this.department,
          date:             this.date,
          time:             result.time,
          attendanceStatus: result.attendanceStatus,
        });
        this.snackBar.open('Record added.', 'OK', { duration: 2500 });
        await this.loadAll();
      } catch (e: any) {
        this.snackBar.open(e.message || 'Failed to add record.', 'Dismiss', { duration: 4000 });
      }
    });
  }

  // ── Delete record ─────────────────────────────────────────────────────────

  deleteRecord(record: AccessRecordDto): void {
    const label = this.statusDef(record.attendanceStatus).label;
    const config: DynamicDialogConfig = {
      title: 'Delete Record',
      icon: 'delete_outline',
      message: `Delete the ${label} record at ${record.time}? This cannot be undone.`,
      buttons: [
        { label: 'Cancel', value: false },
        { label: 'Delete', color: 'warn', value: true, icon: 'delete' },
      ],
    };
    const ref = this.dialog.open(DynamicDialogComponent, { width: '400px', data: config });
    ref.afterClosed().subscribe(async (confirmed: boolean) => {
      if (!confirmed) return;
      this.deletingId = record.id;
      try {
        await this.api.deleteAccessRecord(record.id);
        this.snackBar.open('Record deleted.', 'OK', { duration: 2500 });
        await this.loadAll();
      } catch (e: any) {
        this.snackBar.open(e.message || 'Failed to delete record.', 'Dismiss', { duration: 4000 });
      } finally {
        this.deletingId = null;
      }
    });
  }

  // ── Auto fix ──────────────────────────────────────────────────────────────

  async openAutoFix(): Promise<void> {
    this.fixingAuto = true;
    try {
      const [preview, config] = await Promise.all([
        this.api.getAutoFixPreview(this.date, this.employeeId),
        this.api.getTimeManagementConfig().catch(() => null),
      ]);

      if (preview.issues.length === 0) {
        this.snackBar.open('No issues detected — this day looks good!', 'OK', { duration: 3500 });
        return;
      }

      const ref = this.dialog.open(AutoFixConfirmDialogComponent, {
        width: '600px',
        data: { preview, personName: this.personName, date: this.date, records: this.records, config },
      });

      ref.afterClosed().subscribe(async (editedActions: AutoFixAction[] | null) => {
        if (!editedActions?.length) return;
        try {
          const deleteActions = editedActions.filter(a => a.actionType === 'delete');
          const insertActions = editedActions.filter(a => a.actionType !== 'delete');

          await Promise.all(deleteActions.map(a => this.api.deleteAccessRecord(a.recordId!)));

          if (insertActions.length > 0) {
            const request: AutoFixApplyRequest = {
              employeeId: this.employeeId,
              personName: this.personName,
              department: this.department,
              date:       this.date,
              actions:    insertActions,
            };
            await this.api.applyAutoFix(request);
          }

          this.snackBar.open('Auto-fix applied successfully.', 'OK', { duration: 3000 });
          await this.loadAll();
        } catch (e: any) {
          this.snackBar.open(e.message || 'Failed to apply fix.', 'Dismiss', { duration: 4000 });
        }
      });
    } catch (e: any) {
      this.snackBar.open(e.message || 'Failed to get auto-fix preview.', 'Dismiss', { duration: 4000 });
    } finally {
      this.fixingAuto = false;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  statusDef(raw: string | null): { label: string; color: string } {
    return STATUS_DEFS[raw?.toLowerCase() ?? ''] ?? { label: raw || '—', color: '#8b949e' };
  }

  issueIcon(type: string): string {
    return ISSUE_ICONS[type] ?? 'error_outline';
  }

  goBack(): void {
    this.router.navigate(['/time-management'], {
      state: { savedFilter: this.savedFilter },
    });
  }
}
