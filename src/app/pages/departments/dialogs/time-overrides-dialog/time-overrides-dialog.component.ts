import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TimeOverride } from '../../../../models/time-override.model';
import { ApiService } from '../../../../services/api.service';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-time-overrides-dialog',
  templateUrl: './time-overrides-dialog.component.html',
  styleUrls: ['./time-overrides-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, ReactiveFormsModule, MatProgressSpinnerModule, MatTableModule]
})
export class TimeOverridesDialogComponent implements OnInit {
  overrides: TimeOverride[] = [];
  loading = true;
  error: string | null = null;
  form: FormGroup;
  editing: TimeOverride | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { departmentId: string, departmentName: string },
    private dialogRef: MatDialogRef<TimeOverridesDialogComponent>,
    private api: ApiService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      fromTime: ['', Validators.required],
      toTime: ['', Validators.required],
      overrideTime: ['', Validators.required],
    });
  }

  async ngOnInit() {
    await this.loadOverrides();
  }

  async loadOverrides() {
    this.loading = true;
    this.error = null;
    try {
      const all = await this.api.getTimeOverrides(this.data.departmentId);
      this.overrides = all;
    } catch (e) {
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }

  startAdd() {
    this.editing = null;
    this.form.reset();
  }

  startEdit(override: TimeOverride) {
    this.editing = override;
    this.form.patchValue(override);
  }

  async save() {
    if (this.form.invalid) return;
    const value = this.form.value;
    try {
      if (this.editing) {
        await this.api.updateTimeOverride(this.editing.id, value);
      } else {
        await this.api.createTimeOverride({ ...value, departmentId: this.data.departmentId });
      }
      await this.loadOverrides();
      this.form.reset();
      this.editing = null;
    } catch (e) {
      this.error = String(e);
    }
  }

  async delete(override: TimeOverride) {
    if (!confirm('Delete this time override?')) return;
    try {
      await this.api.deleteTimeOverride(override.id);
      await this.loadOverrides();
    } catch (e) {
      this.error = String(e);
    }
  }

  close() {
    this.dialogRef.close();
  }
}
