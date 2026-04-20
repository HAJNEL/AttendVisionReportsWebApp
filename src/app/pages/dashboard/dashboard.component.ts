import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, Plugin } from 'chart.js';
import { DayPersonRow } from '../../models/day-person-row.model';
import { DashboardService, DashboardKpis, LabeledCount, Department, DayEventRow, IssueRow } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    BaseChartDirective,
    MatTooltipModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  animations: [
    trigger('expandCollapse', [
      state('expanded', style({ height: '*', opacity: 1, overflow: 'hidden' })),
      state('collapsed', style({ height: '0px', opacity: 0, overflow: 'hidden' })),
      transition('expanded <=> collapsed', animate('200ms ease-in-out')),
    ]),
    trigger('rotateChevron', [
      state('open', style({ transform: 'rotate(180deg)' })),
      state('closed', style({ transform: 'rotate(0deg)' })),
      transition('open <=> closed', animate('200ms ease-in-out')),
    ]),
  ],
})
export class DashboardComponent implements OnInit {
  /**
   * Returns the duration between two time strings (HH:mm:ss or HH:mm) as hh:mm string.
   */
  getDurationStr(start: string, end: string): string {
    if (!start || !end) return '';
    // Accepts 'HH:mm:ss' or 'HH:mm'
    const parse = (t: string) => {
      const [h, m, s] = t.split(':').map(Number);
      return { h: h || 0, m: m || 0, s: s ?? 0 };
    };
    const s = parse(start);
    const e = parse(end);
    const startMins = s.h * 60 + s.m + (s.s || 0) / 60;
    const endMins = e.h * 60 + e.m + (e.s || 0) / 60;
    let diff = Math.round((endMins - startMins) * 60); // in seconds
    if (diff < 0) diff += 24 * 60 * 60; // handle overnight
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  loading = true;
  error: string | null = null;
  filtersExpanded = true;

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

  departments: Department[] = [];
  selectedDeptId: string = '';
  showAllDepartmentsOption = false;
  employees: string[] = [];
  selectedEmployee: string = '';

  get selectedDeptName(): string | null {
    if (!this.selectedDeptId) return null;
    return this.departments.find(d => d.id === this.selectedDeptId)?.departmentName ?? null;
  }

  kpis: DashboardKpis = { total_employees: 0, checkins_today: 0, on_site_now: 0, failed_today: 0, on_break_now: 0 };

  // --- Status colour config ---
  readonly STATUS_CONFIG: Record<string, { label: string; bg: string; border: string }> = {
    check_in: { label: 'Check In', bg: 'rgba(63,185,80,0.75)', border: '#3fb950' },
    check_out: { label: 'Check Out', bg: 'rgba(88,166,255,0.75)', border: '#58a6ff' },
    break_out: { label: 'Break Out', bg: 'rgba(227,179,65,0.75)', border: '#e3b341' },
    break_in: { label: 'Break In', bg: 'rgba(163,113,247,0.75)', border: '#a371f7' },
    failed: { label: 'Failed', bg: 'rgba(248,81,73,0.75)', border: '#f85149' },
    unknown: { label: 'Unknown', bg: 'rgba(139,148,158,0.6)', border: '#8b949e' },
  };

  // --- Day events bar chart (trendPeriod === 'day') ---
  dayBarData: ChartData<'bar'> = { labels: [], datasets: [] };
  dayBarOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom', labels: { color: '#8b949e', boxWidth: 12, padding: 14, font: { size: 11 } } },
      tooltip: { mode: 'index', intersect: false },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        ticks: { color: '#8b949e', maxTicksLimit: 12 },
        grid: { color: 'rgba(48,54,61,0.6)' },
      },
      y: {
        ticks: { color: '#8b949e', precision: 0, stepSize: 1 },
        grid: { color: 'rgba(48,54,61,0.6)' },
        beginAtZero: true,
        title: { display: true, text: 'Events', color: '#6e7681', font: { size: 11 } },
      },
    },
  };

  // Cross-highlight state
  dayEventsMap = new Map<string, Map<string, { count: number; names: string }>>();
  dayEventsLabels: string[] = [];
  dayEventsStatuses: string[] = [];
  dayPeople: DayPersonRow[] = [];
  activePeople = new Set<string>();
  hoveredPerson: string | null = null;
  /** When non-null, the people card is locked to this bar click and hover has no effect */
  clickLocked = false;
  /** Stores the selected time label when a bar is selected */
  selectedBarTime: string | null = null;
  issues: IssueRow[] = [];

  // --- Status filter for the day bar chart ---
  /**
   * Multi-select status filter for the trend chart.
   * If ['all'] is selected, all others are unselected and vice versa.
   */
  trendStatusFilterMulti: string[] = ['all'];
  private rawDayEvents: DayEventRow[] = [];

  private readonly STATUS_FILTER_MAP: Record<string, string[]> = {
    all: [],
    checkinout: ['check_in', 'check_out'],
    breakinout: ['break_out', 'break_in'],
  };

  /**
   * Returns the allowed statuses based on the current multi-select filter.
   */
  private getAllowedStatuses(): string[] {
    if (this.trendStatusFilterMulti.includes('all')) return [];
    let allowed: string[] = [];
    if (this.trendStatusFilterMulti.includes('checkinout')) allowed.push(...this.STATUS_FILTER_MAP['checkinout']);
    if (this.trendStatusFilterMulti.includes('breakinout')) allowed.push(...this.STATUS_FILTER_MAP['breakinout']);
    if (this.trendStatusFilterMulti.includes('unknown')) allowed.push(...this.STATUS_FILTER_MAP['unknown']);
    return allowed;
  }


  private filterDayEvents(rows: DayEventRow[]): DayEventRow[] {
    const allowed = this.getAllowedStatuses();
    return allowed.length ? rows.filter(r => allowed.includes(r.status)) : rows;
  }

  /**
   * Called from each individual toggle button's (change) event.
   * event.source.value = the toggled button's value
   * event.source.checked = whether it is now checked
   */
  onTrendStatusToggle(event: any): void {
    const clicked = event.source.value as string;
    const isChecked = event.source.checked as boolean;

    let next: string[];
    if (clicked === 'all') {
      // 'All' always resets everything else
      next = ['all'];
    } else if (isChecked) {
      // Adding a specific filter — remove 'all'
      next = [...this.trendStatusFilterMulti.filter(v => v !== 'all'), clicked];
    } else {
      // Removing a specific filter
      next = this.trendStatusFilterMulti.filter(v => v !== clicked);
      if (next.length === 0) next = ['all']; // never leave empty
    }

    this.trendStatusFilterMulti = next;
    this.dayBarData = this.buildDayEventsChart(this.filterDayEvents(this.rawDayEvents));
    this.cdr.detectChanges();
  }


  // (Obsolete single-select filter method removed)

  // --- Hourly Traffic line chart ---
  hourlyData: ChartData<'line'> = { labels: [], datasets: [] };
  hourlyOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        ticks: { color: '#8b949e', maxTicksLimit: 9 },
        grid: { color: 'rgba(48,54,61,0.6)' },
      },
      y: {
        ticks: { color: '#8b949e', precision: 0, stepSize: 1 },
        grid: { color: 'rgba(48,54,61,0.6)' },
        beginAtZero: true,
        title: { display: true, text: 'Visit Records', color: '#6e7681', font: { size: 11 } },
      },
    },
  };
  hourlyPlugins: Plugin<'line'>[] = [{
    id: 'hourlyAreaGradient',
    beforeDatasetsDraw(chart: any): void {
      if (!chart.data.datasets?.[0]) return;
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      gradient.addColorStop(0, 'rgba(88,166,255,0.45)');
      gradient.addColorStop(1, 'rgba(88,166,255,0.0)');
      chart.data.datasets[0].backgroundColor = gradient;
    },
  }];

  trendPeriod: 'day' | 'month' | 'year' = 'day';
  trendLoading = false;
  viewDate = new Date();
  hourlyNames: string[] = [];

  private readonly MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  private readonly MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  get kpiPeriodLabel(): string {
    return this.dateLabel;
  }

  get dateLabel(): string {
    if (this.trendPeriod === 'year') return String(this.viewDate.getFullYear());
    if (this.trendPeriod === 'month') return `${this.MONTHS[this.viewDate.getMonth()]} ${this.viewDate.getFullYear()}`;
    return `${this.viewDate.getDate()} ${this.MONTHS[this.viewDate.getMonth()]} ${this.viewDate.getFullYear()}`;
  }

  get canGoForward(): boolean {
    const t = new Date();
    if (this.trendPeriod === 'year') return this.viewDate.getFullYear() < t.getFullYear();
    if (this.trendPeriod === 'month') {
      return this.viewDate.getFullYear() < t.getFullYear() ||
        (this.viewDate.getFullYear() === t.getFullYear() && this.viewDate.getMonth() < t.getMonth());
    }
    return this.toDateString(this.viewDate) < this.toDateString(t);
  }

  get trendTitle(): string {
    if (this.trendPeriod === 'day') return 'Access Trend';
    if (this.trendPeriod === 'month') return 'Access Trend';
    return 'Access Trend';
  }

  get trendSubtitle(): string {
    if (this.trendPeriod === 'day') return 'Events by status — 15-min buckets';
    if (this.trendPeriod === 'month') return 'Events per day';
    return 'Events per month';
  }

  // --- Monthly Attendance line chart ---
  monthlyData: ChartData<'line'> = { labels: [], datasets: [] };
  monthlyOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index' },
    },
    scales: {
      x: { ticks: { color: '#8b949e', maxTicksLimit: 15 }, grid: { color: 'rgba(48,54,61,0.8)' } },
      y: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.8)' }, beginAtZero: true },
    },
  };

  // --- Dept Breakdown horizontal bar chart ---
  deptData: ChartData<'bar'> = { labels: [], datasets: [] };
  deptOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.8)' }, beginAtZero: true },
      y: { ticks: { color: '#c9d1d9' }, grid: { display: false } },
    },
  };

  constructor(private dashboardService: DashboardService, private cdr: ChangeDetectorRef) { }

  async ngOnInit(): Promise<void> {
    // Existing line-chart tooltip (month/year views)
    (this.hourlyOptions!.plugins!.tooltip as any).callbacks = {
      afterBody: (items: any[]) => {
        if (!items.length || !this.hourlyNames.length) return [];
        const names = this.hourlyNames[items[0].dataIndex] ?? '';
        if (!names) return [];
        return ['', ...names.split(', ')];
      },
    };

    // Load departments and employees asynchronously, then set default selection logic
    this.departments = await this.dashboardService.getDepartments().catch(() => []);
    this.employees = await this.dashboardService.getEmployees().catch(() => []);

    if (this.departments.length === 1) {
      this.selectedDeptId = this.departments[0].id;
      this.showAllDepartmentsOption = false;
    } else if (this.departments.length > 1) {
      this.selectedDeptId = 'all';
      this.showAllDepartmentsOption = true;
    } else {
      this.selectedDeptId = '';
      this.showAllDepartmentsOption = false;
    }

    await this.loadAll();

    // Day bar chart: tooltip shows names per status
    (this.dayBarOptions!.plugins!.tooltip as any).callbacks = {
      label: (item: any) => {
        const count = item.raw as number;
        if (!count) return null;
        const statusKey = this.dayEventsStatuses[item.datasetIndex];
        const label = this.dayEventsLabels[item.dataIndex];
        const entry = statusKey && label ? this.dayEventsMap.get(label)?.get(statusKey) : undefined;
        const displayLabel = this.STATUS_CONFIG[statusKey]?.label ?? statusKey;
        return `${displayLabel} (${count}): ${entry?.names ?? ''}`;
      },
      filter: (item: any) => (item.raw as number) > 0,
    };

    // Day bar chart: cross-highlight people list on hover
    (this.dayBarOptions as any).onHover = (_: any, elements: any[]) => {
      if (this.clickLocked) return;
      const newPeople = this.getPeopleAtElements(elements);
      if (!this.setsEqual(newPeople, this.activePeople)) {
        this.activePeople = newPeople;
        this.cdr.detectChanges();
      }
    };

    // Day bar chart: click locks highlight to specific bar segment
    (this.dayBarOptions as any).onClick = (event: any, elements: any[], chart: any) => {
      if (this.clickLocked) {
        // Any subsequent click — release lock
        this.clickLocked = false;
        this.activePeople = new Set();
        this.selectedBarTime = null;
        this.cdr.detectChanges();
        return;
      }
      // Use 'nearest' + intersect to identify the exact clicked segment
      const nearest: any[] = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
      if (!nearest.length) return; // clicked empty space, do nothing
      const status = this.dayEventsStatuses[nearest[0].datasetIndex];
      const people = this.getPeopleAtElements(nearest, status);
      // Fall back to all people at that bucket if status lookup returns nothing
      this.activePeople = people.size ? people : this.getPeopleAtElements(nearest);
      // Set the selected time label for the filter display
      this.selectedBarTime = this.dayEventsLabels[nearest[0].index] || null;
      this.clickLocked = true;
      // Force change detection after the stack clears to ensure UI updates
      setTimeout(() => this.cdr.detectChanges(), 0);
    };

    this.departments = await this.dashboardService.getDepartments().catch(() => []);
    this.employees = await this.dashboardService.getEmployees().catch(() => []);
    await this.loadAll();
  }

  async loadAll(): Promise<void> {
    this.loading = true;
    this.error = null;
    const dept = this.selectedDeptName;
    const emp = this.selectedEmployee || null;
    const date = this.toDateString(this.viewDate);
    const range = this.getDateRange();
    try {
      const [kpis, dayEvents, dayPeople, monthly, issues, timesheets, onBreakNow] = await Promise.all([
        this.dashboardService.getKpis(range.from, range.to, dept, emp),
        this.dashboardService.getDayEventsByStatus(date, dept, emp),
        this.dashboardService.getDayPeople(date, dept, emp),
        this.dashboardService.getMonthlyAttendance(dept, emp),
        this.dashboardService.getIssues(range.from, range.to, dept, emp),
        this.dashboardService.api.getTimesheetReport(dept, date, date, null),
        this.dashboardService.getOnBreakNow(date, dept, emp),
      ]);
      const mappedKpis = {
        total_employees: kpis.total_employees ?? 0,
        checkins_today: kpis.checkins_today ?? 0,
        on_site_now: kpis.on_site_now ?? 0,
        failed_today: kpis.failed_today ?? 0,
        on_break_now: onBreakNow ?? 0,
      };
      this.dayPeople = dayPeople;
      this.kpis = mappedKpis;
      this.rawDayEvents = dayEvents;
      this.dayBarData = this.buildDayEventsChart(this.filterDayEvents(dayEvents));
      this.issues = issues;
    } catch (e) {
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }

  async setTrendPeriod(period: 'day' | 'month' | 'year'): Promise<void> {
    if (period === this.trendPeriod) return;
    this.trendPeriod = period;
    this.viewDate = new Date(); // reset to today on period switch
    await Promise.all([this.loadTrendChart(), this.loadAll()]);
  }

  async onDeptChange(): Promise<void> {
    this.selectedEmployee = '';
    this.employees = await this.dashboardService.getEmployees(this.selectedDeptName).catch(() => []);;
    await this.loadAll();
    if (this.trendPeriod !== 'day') {
      await this.loadTrendChart();
    }
  }

  async onEmployeeChange(): Promise<void> {
    await this.loadAll();
    if (this.trendPeriod !== 'day') {
      await this.loadTrendChart();
    }
  }

  async goBack(): Promise<void> {
    const d = new Date(this.viewDate);
    if (this.trendPeriod === 'year') d.setFullYear(d.getFullYear() - 1);
    else if (this.trendPeriod === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 1);
    this.viewDate = d;
    await Promise.all([this.loadTrendChart(), this.loadAll()]);
  }

  async goForward(): Promise<void> {
    if (!this.canGoForward) return;
    const d = new Date(this.viewDate);
    if (this.trendPeriod === 'year') d.setFullYear(d.getFullYear() + 1);
    else if (this.trendPeriod === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 1);
    this.viewDate = d;
    await Promise.all([this.loadTrendChart(), this.loadAll()]);
  }

  private mapKpis(k: any): DashboardKpis {
    return {
      total_employees: k.total_employees ?? 0,
      checkins_today: k.checkins_today ?? 0,
      on_site_now: k.on_site_now ?? 0,
      failed_today: k.failed_today ?? 0,
    };
  }

  private toDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private async loadTrendChart(): Promise<void> {
    this.trendLoading = true;
    const xTicks = this.hourlyOptions!.scales!['x']!.ticks as any;
    xTicks.maxTicksLimit = this.trendPeriod === 'day' ? 12
      : this.trendPeriod === 'month' ? 16
        : 12;
    try {
      const dept = this.selectedDeptName;
      const emp = this.selectedEmployee || null;
      const date = this.toDateString(this.viewDate);
      const range = this.getDateRange();
      if (this.trendPeriod === 'day') {
        const [kpis, dayEvents, dayPeople, issues] = await Promise.all([
          this.dashboardService.getKpis(range.from, range.to, dept, emp),
          this.dashboardService.getDayEventsByStatus(date, dept, emp),
          this.dashboardService.getDayPeople(date, dept, emp),
          this.dashboardService.getIssues(range.from, range.to, dept, emp),
        ]);
        this.kpis = this.mapKpis(kpis);
        this.rawDayEvents = dayEvents;
        this.dayBarData = this.buildDayEventsChart(this.filterDayEvents(dayEvents));
        this.dayPeople = dayPeople;
        this.issues = issues;
      } else if (this.trendPeriod === 'month') {
        this.hourlyNames = [];
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth() + 1; // 1-based
        const today = this.toDateString(new Date());
        const [kpis, rows, issues, dayPeople] = await Promise.all([
          this.dashboardService.getKpis(range.from, range.to, dept, emp),
          this.dashboardService.getMonthlyTraffic(year, month, dept, emp),
          this.dashboardService.getIssues(range.from, range.to, dept, emp),
          this.dashboardService.getDayPeople(today, dept, emp),
        ]);
        this.kpis = this.mapKpis(kpis);
        this.issues = issues;
        this.dayPeople = dayPeople;
        const map = new Map(rows.map(r => [r.label, r.count]));
        const daysInMonth = new Date(year, month, 0).getDate();
        const labels: string[] = [];
        const data: number[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          labels.push(String(d));
          const value = map.get(key) ?? 0;
          data.push(value);
        }
        this.hourlyData = this.buildTrafficChart(
          labels.map((label, i) => ({ label, count: data[i] })),
          r => r.map(x => x.label));
      } else {
        this.hourlyNames = [];
        const year = this.viewDate.getFullYear();
        const today = this.toDateString(new Date());
        const [kpis, rows, issues, dayPeople] = await Promise.all([
          this.dashboardService.getKpis(range.from, range.to, dept, emp),
          this.dashboardService.getYearlyTraffic(year, dept, emp),
          this.dashboardService.getIssues(range.from, range.to, dept, emp),
          this.dashboardService.getDayPeople(today, dept, emp),
        ]);
        this.kpis = this.mapKpis(kpis);
        this.issues = issues;
        this.dayPeople = dayPeople;
        const map = new Map(rows.map(r => [r.label, r.count]));
        const items = this.MONTH_SHORT.map((name, i) => ({
          label: name,
          count: map.get(`${year}-${String(i + 1).padStart(2, '0')}`) ?? 0,
        }));
        this.hourlyData = this.buildTrafficChart(items, r => r.map(x => x.label));
      }
    } finally {
      this.trendLoading = false;
    }
  }

  private buildTrafficChart(
    rows: { label: string; count: number }[],
    toLabels: (rows: { label: string; count: number }[]) => string[]
  ): ChartData<'line'> {
    return {
      labels: toLabels(rows),
      datasets: [{
        data: rows.map(r => r.count),
        label: 'Visit Records',
        borderColor: '#58a6ff',
        borderWidth: 2,
        fill: true,
        backgroundColor: 'rgba(88,166,255,0.2)',
        tension: 0.35,
        pointBackgroundColor: '#58a6ff',
        pointBorderColor: '#58a6ff',
        pointRadius: 3,
        pointHoverRadius: 5,
      }],
    };
  }

  private buildDayEventsChart(rows: DayEventRow[]): ChartData<'bar'> {
    const labelSet = new Set(rows.map(r => r.label));
    const labels = Array.from(labelSet).sort();

    // Collect statuses in preferred order
    const statusOrder = ['check_in', 'check_out', 'break_out', 'break_in', 'failed']; // 'unknown' removed
    const presentStatuses = new Set(rows.map(r => r.status));
    const statuses = [
      ...statusOrder.filter(s => presentStatuses.has(s)),
      ...Array.from(presentStatuses).filter(s => !statusOrder.includes(s) && s !== 'unknown'), // filter out 'unknown'
    ];

    // Build map: time-label → status → {count, names}
    const map = new Map<string, Map<string, { count: number; names: string }>>();
    for (const row of rows) {
      if (!map.has(row.label)) map.set(row.label, new Map());
      map.get(row.label)!.set(row.status, { count: row.count, names: row.names });
    }

    this.dayEventsMap = map;
    this.dayEventsLabels = labels;
    this.dayEventsStatuses = statuses;
    this.activePeople = new Set();
    this.clickLocked = false;
    this.selectedBarTime = null;

    const datasets: ChartData<'bar'>['datasets'] = statuses.map(status => {
      const cfg = this.STATUS_CONFIG[status] ?? { label: status, bg: '#8b949e', border: '#8b949e' };
      return {
        label: cfg.label,
        data: labels.map(l => map.get(l)?.get(status)?.count ?? 0),
        backgroundColor: cfg.bg,
        borderColor: cfg.border,
        borderWidth: 1,
        borderRadius: 3,
      };
    });

    return { labels, datasets };
  }

  statusLabel(key: string): string {
    return this.STATUS_CONFIG[key]?.label ?? key;
  }

  issueLabel(type: string): string {
    const map: Record<string, string> = {
      failed_attempt: 'Failed Attempt',
      no_checkout: 'No Check-Out',
      unmatched_break: 'Unmatched Break',
    };
    return map[type] ?? type;
  }

  private getDateRange(): { from: string; to: string } {
    const d = this.viewDate;
    if (this.trendPeriod === 'day') {
      const s = this.toDateString(d);
      return { from: s, to: s };
    }
    if (this.trendPeriod === 'month') {
      const y = d.getFullYear(), m = d.getMonth() + 1;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return {
        from: `${y}-${String(m).padStart(2, '0')}-01`,
        to: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      };
    }
    const y = d.getFullYear();
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }

  fmtHours(h: number): string {
    if (h <= 0) return '';
    const totalMin = Math.round(h * 60);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  private getPeopleAtElements(elements: any[], statusFilter?: string): Set<string> {
    if (!elements.length) return new Set();
    const label = this.dayEventsLabels[elements[0].index];
    if (!label) return new Set();
    const statusMap = this.dayEventsMap.get(label);
    if (!statusMap) return new Set();
    const names = new Set<string>();
    if (statusFilter) {
      const entry = statusMap.get(statusFilter);
      if (entry?.names) entry.names.split(', ').forEach(n => { const t = n.trim(); if (t) names.add(t); });
    } else {
      statusMap.forEach(({ names: ns }) => {
        if (ns) ns.split(', ').forEach(n => { const t = n.trim(); if (t) names.add(t); });
      });
    }
    return names;
  }

  private setsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const x of a) if (!b.has(x)) return false;
    return true;
  }

  private buildMonthlyChart(rows: LabeledCount[]): ChartData<'line'> {
    return {
      labels: rows.map(r => r.label.slice(5)), // show MM-DD
      datasets: [{
        data: rows.map(r => r.count),
        label: 'Employees',
        borderColor: '#3fb950',
        backgroundColor: 'rgba(63,185,80,0.15)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#3fb950',
        pointRadius: 3,
      }],
    };
  }
}
