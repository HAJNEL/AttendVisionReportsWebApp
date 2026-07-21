import * as XLSX from 'xlsx';
import fs from 'fs';

// Mirror TimesheetReportComponent's buildTimesheetSheet / sanitize / uniqueName / exportPerUserSheets logic exactly.

function formatHHMM(h) {
  if (!h || h < 0) return '00:00';
  const totalMins = Math.round(h * 60);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
function netHours(row) {
  return Math.max(0, (row.hours_worked ?? 0) - (row.break_hours ?? 0));
}

function buildTimesheetSheet(rows, filters) {
  const dept = filters.department ?? 'All Departments';
  const from = filters.dateFrom;
  const to = filters.dateTo;
  const employeeId = filters.employeeId ?? 'All Users';

  const totalHours = rows.reduce((sum, r) => sum + (r.hours_worked ?? 0), 0);
  const totalBreakHours = rows.reduce((sum, r) => sum + (r.break_hours ?? 0), 0);
  const totalNetHours = totalHours - totalBreakHours;

  const data = [
    ['Timesheet Report'],
    ['Department', dept],
    ['Date From', from],
    ['Date To', to],
    ['Employee ID', employeeId],
    [],
    ['Date', 'Employee', 'Employee ID', 'Status', 'Department', 'First Entry', 'Last Entry', 'Total Span', 'Break Time', 'Net Hours'],
    ...rows.map(r => [
      r.date, r.person, r.employee_id, r.status, r.department,
      r.first_entry, r.last_entry,
      formatHHMM(r.hours_worked), formatHHMM(r.break_hours), formatHHMM(netHours(r)),
    ]),
    [],
    ['', '', '', '', '', '', '', 'Total Span', 'Total Break', 'Net Hours'],
    ['', '', '', '', '', '', '', formatHHMM(totalHours), formatHHMM(totalBreakHours), formatHHMM(totalNetHours)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 14 },
    { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
  ];
  return ws;
}

function groupRowsByEmployee(rows) {
  const groups = new Map();
  for (const r of rows) {
    const key = r.employee_id || r.person;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return groups;
}

function sanitizeSheetName(name) {
  return (name || 'Unknown').replace(/[:\\/?*[\]]/g, '_').slice(0, 31);
}

function uniqueName(base, usedNames, maxLen) {
  let candidate = base;
  let n = 1;
  while (usedNames.has(candidate)) {
    const suffix = `_${++n}`;
    candidate = base.slice(0, Math.max(0, maxLen - suffix.length)) + suffix;
  }
  usedNames.add(candidate);
  return candidate;
}

// Sample data mimicking a real report: many rows, some duplicate names, long names, special chars.
const rows = [];
const people = [
  ['Riverland', 'John Smith', 'EMP001'],
  ['Riverland', 'Jane Doe', 'EMP002'],
  ['Riverland', 'John Smith', 'EMP003'], // duplicate display name, different id
  ['Riverland', "O'Brien / Sales [Team]", 'EMP004'], // special chars
  ['Riverland', 'A Very Long Employee Name That Exceeds Thirty One Characters For Sure', 'EMP005'],
  ['Riverland', '', 'EMP006'], // blank name
];
for (let d = 1; d <= 5; d++) {
  for (const [dept, person, empId] of people) {
    rows.push({
      person, employee_id: empId, status: 'Worked', department: dept,
      date: `2026-06-${String(d).padStart(2, '0')}`,
      first_entry: '08:00', last_entry: '17:00',
      hours_worked: 9, break_hours: 1,
    });
  }
}

const filters = { department: 'Riverland', dateFrom: '2026-06-24', dateTo: '2026-07-23' };

const groups = groupRowsByEmployee(rows);
const wb = XLSX.utils.book_new();
const usedNames = new Set();
for (const groupRows of groups.values()) {
  const ws = buildTimesheetSheet(groupRows, filters);
  const displayName = groupRows[0]?.person || 'Unknown';
  const sheetName = uniqueName(sanitizeSheetName(displayName), usedNames, 31);
  console.log('Appending sheet:', JSON.stringify(sheetName));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
const outPath = './repro-out.xlsx';
fs.writeFileSync(outPath, Buffer.from(buf));
console.log('Wrote', outPath, fs.statSync(outPath).size, 'bytes');

// Round-trip: re-read with SheetJS to validate structure
const reread = XLSX.read(fs.readFileSync(outPath), { type: 'buffer' });
console.log('Re-read sheet names:', reread.SheetNames);

// Check zip magic bytes (xlsx is a zip container)
const head = fs.readFileSync(outPath).subarray(0, 4);
console.log('Magic bytes:', head);
