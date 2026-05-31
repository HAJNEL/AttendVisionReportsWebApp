import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgIf, NgFor, NgTemplateOutlet } from '@angular/common';

export interface DynamicDialogButton {
  label: string;
  color?: 'primary' | 'accent' | 'warn' | undefined;
  value: any;
  icon?: string;
  type?: 'button' | 'submit';
}

export interface DynamicDialogConfig {
  title?: string;
  icon?: string;
  message?: string;
  htmlContent?: string;
  buttons: DynamicDialogButton[];
}

@Component({
  selector: 'app-dynamic-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, NgIf, NgFor, NgTemplateOutlet],
  template: `
    <h2 mat-dialog-title *ngIf="data.title">
      <mat-icon *ngIf="data.icon">{{ data.icon }}</mat-icon>
      {{ data.title }}
    </h2>
    <mat-dialog-content>
      <div *ngIf="data.message">{{ data.message }}</div>
      <div *ngIf="data.htmlContent" [innerHTML]="data.htmlContent"></div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <ng-container *ngFor="let btn of data.buttons">
        <button mat-flat-button
                [color]="btn.color"
                [type]="btn.type || 'button'"
                (click)="close(btn.value)">
          <mat-icon *ngIf="btn.icon">{{ btn.icon }}</mat-icon>
          {{ btn.label }}
        </button>
      </ng-container>
    </mat-dialog-actions>
  `,
})
export class DynamicDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DynamicDialogConfig,
    private dialogRef: MatDialogRef<DynamicDialogComponent, any>
  ) {}

  close(value: any) {
    this.dialogRef.close(value);
  }
}
