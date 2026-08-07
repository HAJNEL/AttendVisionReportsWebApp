import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { HikCentralOrganization, HikCentralPerson } from '../../../../models/hikcentral-person.model';

export interface PersonFormDialogData {
  person: HikCentralPerson | null;
  organizations: HikCentralOrganization[];
}

@Component({
  selector: 'app-person-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
  ],
  templateUrl: './person-dialog.component.html',
  styleUrls: ['./person-dialog.component.scss'],
})
export class PersonFormDialogComponent {
  isEdit: boolean;
  form: FormGroup;
  organizations: HikCentralOrganization[];

  constructor(
    public dialogRef: MatDialogRef<PersonFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PersonFormDialogData,
  ) {
    this.isEdit = data.person !== null;
    this.organizations = data.organizations;
    const p = data.person;
    this.form = new FormGroup({
      personCode: new FormControl({ value: p?.personCode ?? '', disabled: this.isEdit }, Validators.required),
      personName: new FormControl(p?.personName ?? '', Validators.required),
      orgIndexCode: new FormControl(p?.orgIndexCode ?? null, Validators.required),
      gender: new FormControl(p?.gender ?? null),
      phoneNo: new FormControl(p?.phoneNo ?? ''),
      email: new FormControl(p?.email ?? ''),
      jobNo: new FormControl(p?.jobNo ?? ''),
    });
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.dialogRef.close({
      personCode: v.personCode,
      personName: v.personName,
      orgIndexCode: v.orgIndexCode,
      gender: v.gender || null,
      phoneNo: v.phoneNo || null,
      email: v.email || null,
      jobNo: v.jobNo || null,
    });
  }
}

export interface PersonConfirmDialogData {
  name: string;
}

@Component({
  selector: 'app-person-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Delete Person</h2>
    <mat-dialog-content>
      <p>Are you sure you want to delete <strong>{{ data.name }}</strong> from HikCentral?</p>
      <p style="color:#8b949e;font-size:13px;">This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">Cancel</button>
      <button mat-flat-button color="warn" (click)="dialogRef.close(true)">Delete</button>
    </mat-dialog-actions>
  `,
})
export class PersonConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<PersonConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PersonConfirmDialogData,
  ) {}
}
