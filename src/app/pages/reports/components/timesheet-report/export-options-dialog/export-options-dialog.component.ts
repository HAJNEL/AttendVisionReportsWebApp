import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';

export type TimesheetExportMode = 'single' | 'per-user-sheets' | 'per-user-zip';

@Component({
  selector: 'app-export-options-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatRadioModule, MatButtonModule],
  templateUrl: './export-options-dialog.component.html',
  styleUrls: ['./export-options-dialog.component.scss'],
})
export class ExportOptionsDialogComponent {
  selectedMode: TimesheetExportMode = 'single';

  constructor(public dialogRef: MatDialogRef<ExportOptionsDialogComponent>) {}

  onExport(): void {
    this.dialogRef.close(this.selectedMode);
  }

  onCancel(): void {
    this.dialogRef.close(undefined);
  }
}
