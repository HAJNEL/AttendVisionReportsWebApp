import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { DynamicFilterDialogComponent, ReportFilters } from './helpers/dynamic-filter-dialog/dynamic-filter-dialog.component';
import { TimesheetReportComponent } from './components/timesheet-report/timesheet-report.component';
import { IssueReportComponent } from './components/issue-report/issue-report.component';
import { ClockingsReportComponent } from './components/clockings-report/clockings-report.component';
import { ReportConfig } from '../../models/reports.model';

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
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent {
  displayedColumns: string[] = ['name', 'type', 'description', 'actions'];

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

  constructor(private dialog: MatDialog) {}

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
        case 'timeheet':
        default:
          this.dialog.open(TimesheetReportComponent, dialogConfig);
          break;
      }
    });
  }
}
