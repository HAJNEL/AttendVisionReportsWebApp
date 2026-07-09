import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DynamicFilterDialogComponent, ReportFilters } from './helpers/dynamic-filter-dialog/dynamic-filter-dialog.component';
import { TimesheetReportComponent } from './components/timesheet-report/timesheet-report.component';
import { SageTimesheetReportComponent } from './components/sage-timesheet-report/sage-timesheet-report.component';
import { IssueReportComponent } from './components/issue-report/issue-report.component';
import { ClockingsReportComponent } from './components/clockings-report/clockings-report.component';
import { ReportSettingsDialogComponent } from './dialogs/report-settings-dialog.component';
import { ReportConfig } from '../../models/reports.model';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatCardModule,
    MatMenuModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent {
  displayedColumns: string[] = ['name', 'type', 'description', 'actions'];
  loadingConfig = false;

  reports: ReportConfig[] = [
    {
      id: 'timesheet',
      name: 'Timesheet',
      description: 'Lists time entries per employee for a selected department and date range.',
      filterConfig: {
        title: 'Timesheet Report — Parameters',
        showDepartment: true,
        showDateRange: true,
        showEmployee: true,
      },
    },
    {
      id: 'sage-timesheet',
      name: 'SAGE Timesheets',
      description: 'SAGE-formatted timesheet export for payroll, filtered by department, employee, and date range.',
      filterConfig: {
        title: 'SAGE Timesheets',
        showDepartment: true,
        showDateRange: true,
        showEmployee: true,
      },
    },
    {
      id: 'issues',
      name: 'Issues',
      description: 'Highlights attendance problems: failed authentications, missing check-outs, and unmatched breaks.',
      filterConfig: {
        title: 'Issue Report — Parameters',
        showDepartment: true,
        showDateRange: true,
        showEmployee: true,
      },
    },
    {
      id: 'clockings',
      name: 'Clockings',
      description: 'Full list of raw clocking events per employee showing time, attendance status and authentication result.',
      filterConfig: {
        title: 'Clockings Report — Parameters',
        showDepartment: true,
        showDateRange: true,
        showEmployee: true,
      },
    },
  ];

  constructor(private dialog: MatDialog, private api: ApiService, private snackBar: MatSnackBar) {}

  openSettings(): void {
    this.loadingConfig = true;
    this.api.getReportConfig()
      .then(config => {
        this.dialog.open(ReportSettingsDialogComponent, {
          width: '480px',
          data: { config },
        });
      })
      .catch((e: any) => {
        this.snackBar.open(e?.error?.error || e?.message || 'Failed to load settings.', 'Dismiss', { duration: 4000 });
      })
      .finally(() => { this.loadingConfig = false; });
  }

  runReport(report: ReportConfig): void {
    const filterRef = this.dialog.open(DynamicFilterDialogComponent, {
      width: '500px',
      data: report.filterConfig,
    });
    filterRef.afterClosed().subscribe((filters: ReportFilters | undefined) => {
      if (!filters) return;
      const dialogConfig = {
        data: filters,
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        panelClass: 'fullscreen-dialog',
      };
      switch (report.id) {
        case 'issues':
          this.dialog.open(IssueReportComponent, dialogConfig);
          break;
        case 'clockings':
          this.dialog.open(ClockingsReportComponent, dialogConfig);
          break;
        case 'sage-timesheet':
          this.dialog.open(SageTimesheetReportComponent, dialogConfig);
          break;
        case 'timeheet':
        default:
          this.dialog.open(TimesheetReportComponent, dialogConfig);
          break;
      }
    });
  }
}
