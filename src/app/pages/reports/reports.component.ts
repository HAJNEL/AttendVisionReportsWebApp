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

interface ReportDef {
  id: string;
  name: string;
  type: string;
  description: string;
}

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

  reports: ReportDef[] = [
    {
      id: 'timesheet',
      name: 'Timesheet',
      type: 'Time & Attendance',
      description: 'Lists time entries per employee for a selected department and date range.',
    },
    {
      id: 'issues',
      name: 'Issues',
      type: 'Compliance',
      description: 'Highlights attendance problems: failed authentications, missing check-outs, and unmatched breaks.',
    },
    {
      id: 'clockings',
      name: 'Clockings',
      type: 'Time & Attendance',
      description: 'Full list of raw clocking events per employee showing time, attendance status and authentication result.',
    },
  ];

  constructor(private dialog: MatDialog) {}

  runReport(report: ReportDef): void {
    const isIssues = report.id === 'issues';
    const titles: Record<string, string> = {
      timesheet: 'Timesheet Report — Parameters',
      issues:    'Issue Report — Parameters',
      clockings: 'Clockings Report — Parameters',
    };
    const filterRef = this.dialog.open(DynamicFilterDialogComponent, {
      width: '500px',
      data: {
        title: titles[report.id] ?? `${report.name} — Parameters`,
        showUser: !isIssues,
      },
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
      if (isIssues) {
        this.dialog.open(IssueReportComponent, dialogConfig);
      } else if (report.id === 'clockings') {
        this.dialog.open(ClockingsReportComponent, dialogConfig);
      } else {
        this.dialog.open(TimesheetReportComponent, dialogConfig);
      }
    });
  }
}
