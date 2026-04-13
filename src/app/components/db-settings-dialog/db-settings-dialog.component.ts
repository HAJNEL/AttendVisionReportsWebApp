import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatabaseService, DbConfig } from '../../services/database.service';

@Component({
  selector: 'app-db-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Database Connection</h2>
    <mat-dialog-content>
      <p class="hint">Configure the PostgreSQL connection. Settings are saved locally on this machine.</p>
      <form [formGroup]="form" class="settings-form">
        <div class="row-2">
          <mat-form-field appearance="outline" class="grow">
            <mat-label>Host</mat-label>
            <input matInput formControlName="host" placeholder="localhost" />
            <mat-error *ngIf="form.get('host')?.hasError('required')">Required</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" class="port-field">
            <mat-label>Port</mat-label>
            <input matInput type="number" formControlName="port" placeholder="5432" min="1" max="65535" />
            <mat-error *ngIf="form.get('port')?.hasError('required')">Required</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Database</mat-label>
          <input matInput formControlName="database" placeholder="mydatabase" />
          <mat-error *ngIf="form.get('database')?.hasError('required')">Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Username</mat-label>
          <input matInput formControlName="user" placeholder="postgres" />
          <mat-error *ngIf="form.get('user')?.hasError('required')">Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Password</mat-label>
          <input matInput [type]="showPassword ? 'text' : 'password'" formControlName="password" />
          <button mat-icon-button matSuffix type="button" (click)="showPassword = !showPassword">
            <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>
      </form>
      <div *ngIf="statusMsg" class="status-msg" [class.error]="isError" [class.success]="!isError">
        <mat-icon>{{ isError ? 'error_outline' : 'check_circle_outline' }}</mat-icon>
        <span>{{ statusMsg }}</span>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)" [disabled]="busy">Cancel</button>
      <button mat-stroked-button (click)="onTest()" [disabled]="form.invalid || busy">
        <mat-spinner *ngIf="busy === 'test'" diameter="16" class="btn-spinner"></mat-spinner>
        Test
      </button>
      <button mat-flat-button color="primary" (click)="onSave()" [disabled]="form.invalid || busy">
        <mat-spinner *ngIf="busy === 'save'" diameter="16" class="btn-spinner"></mat-spinner>
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .hint { font-size: 13px; color: #8b949e; margin: 0 0 12px; }
    .settings-form { display: flex; flex-direction: column; gap: 4px; min-width: 420px; }
    .full { width: 100%; }
    .row-2 { display: flex; gap: 12px; align-items: flex-start; }
    .grow { flex: 1; }
    .port-field { width: 100px; }
    .status-msg {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-top: 4px;
    }
    .status-msg.error   { background: rgba(248,81,73,0.12); color: #f85149; }
    .status-msg.success { background: rgba(102,187,106,0.12); color: #66bb6a; }
    .btn-spinner { display: inline-block; margin-right: 4px; }
  `],
})
export class DbSettingsDialogComponent implements OnInit {
  form = new FormGroup({
    host:     new FormControl('localhost', Validators.required),
    port:     new FormControl<number>(5432, [Validators.required, Validators.min(1), Validators.max(65535)]),
    database: new FormControl('', Validators.required),
    user:     new FormControl('', Validators.required),
    password: new FormControl(''),
  });

  showPassword = false;
  busy: 'test' | 'save' | null = null;
  statusMsg = '';
  isError = false;

  constructor(
    public dialogRef: MatDialogRef<DbSettingsDialogComponent>,
    private db: DatabaseService,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const config = await this.db.getDbConfig();
      this.form.patchValue(config);
    } catch { /* no existing config */ }
  }

  async onTest(): Promise<void> {
    if (this.form.invalid) return;
    this.busy = 'test';
    this.statusMsg = '';
    try {
      await this.db.testDbConnection(this.formValue());
      this.isError = false;
      this.statusMsg = 'Connection successful!';
    } catch (e) {
      this.isError = true;
      this.statusMsg = String(e);
    } finally {
      this.busy = null;
    }
  }

  async onSave(): Promise<void> {
    if (this.form.invalid) return;
    this.busy = 'save';
    this.statusMsg = '';
    try {
      await this.db.saveDbConfig(this.formValue());
      this.isError = false;
      this.statusMsg = 'Saved and connected!';
      setTimeout(() => this.dialogRef.close(true), 800);
    } catch (e) {
      this.isError = true;
      this.statusMsg = String(e);
      this.busy = null;
    }
  }

  private formValue(): DbConfig {
    const v = this.form.value;
    return {
      host:     v.host     ?? 'localhost',
      port:     v.port     ?? 5432,
      database: v.database ?? '',
      user:     v.user     ?? '',
      password: v.password ?? '',
    };
  }
}
