import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-user-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  templateUrl: './user-confirm-dialog.component.html',
  styleUrls: ['./user-confirm-dialog.component.scss'],
})
export class UserConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<UserConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { username: string }
  ) {}

  onConfirm() {
    this.dialogRef.close(true);
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
