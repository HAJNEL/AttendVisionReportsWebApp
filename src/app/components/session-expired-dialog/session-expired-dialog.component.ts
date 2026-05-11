import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-session-expired-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './session-expired-dialog.component.html',
})
export class SessionExpiredDialogComponent {
  constructor(private dialogRef: MatDialogRef<SessionExpiredDialogComponent>) {}

  confirm(): void {
    this.dialogRef.close();
  }
}
