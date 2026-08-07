import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../../services/api.service';
import { Department } from '../../../../models/department.model';
import { HikCentralOrganization, HikCentralAccessLevel } from '../../../../models/hikcentral-person.model';

@Component({
  selector: 'app-add-person-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatRadioModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './add-person-wizard.component.html',
  styleUrls: ['./add-person-wizard.component.scss'],
})
export class AddPersonWizardComponent implements OnInit {
  @ViewChild(MatStepper) stepper?: MatStepper;

  loading = true;
  submitting = false;
  submitError: string | null = null;

  departments: Department[] = [];
  organizations: HikCentralOrganization[] = [];
  accessLevels: HikCentralAccessLevel[] = [];

  showAllAccessLevels = false;
  selectedAccessLevelIds = new Set<string>();

  basicInfoForm = new FormGroup({
    departmentId: new FormControl<string | null>(null, Validators.required),
    personCode: new FormControl('', Validators.required),
    firstName: new FormControl('', Validators.required),
    lastName: new FormControl('', Validators.required),
  });

  privateInfoForm = new FormGroup({
    gender: new FormControl<number | null>(null),
    email: new FormControl(''),
    phoneNo: new FormControl(''),
    remark: new FormControl(''),
  });

  constructor(
    public dialogRef: MatDialogRef<AddPersonWizardComponent>,
    private api: ApiService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.loading = true;
    try {
      const [departments, orgData, accessLevelData] = await Promise.all([
        this.api.getDepartments().catch(() => []),
        this.api.getHikCentralOrganizations().catch(() => ({ total: 0, list: [] })),
        this.api.getHikCentralAccessLevels().catch(() => ({ total: 0, pageNo: 1, pageSize: 100, list: [] })),
      ]);
      this.departments = departments;
      this.organizations = orgData.list ?? [];
      this.accessLevels = accessLevelData.list ?? [];
      if (this.departments.length === 1) {
        this.basicInfoForm.patchValue({ departmentId: this.departments[0].id });
      }
    } finally {
      this.loading = false;
    }
  }

  get selectedDepartment(): Department | null {
    const id = this.basicInfoForm.value.departmentId;
    return this.departments.find(d => d.id === id) ?? null;
  }

  get resolvedOrgIndexCode(): string | null {
    const dept = this.selectedDepartment;
    if (!dept) return null;
    if (dept.hikCentralOrgIndexCode) return dept.hikCentralOrgIndexCode;
    const match = this.organizations.find(
      o => (o.orgName ?? '').trim().toLowerCase() === dept.departmentName.trim().toLowerCase()
    );
    return match?.orgIndexCode ?? null;
  }

  get filteredAccessLevels(): HikCentralAccessLevel[] {
    if (this.showAllAccessLevels) return this.accessLevels;
    const dept = this.selectedDepartment;
    if (!dept) return this.accessLevels;
    const name = dept.departmentName.trim().toLowerCase();
    return this.accessLevels.filter(level => {
      if ((level.privilegeGroupName ?? '').toLowerCase().includes(name)) return true;
      return (level.ElementList ?? []).some(el =>
        (el.Element?.BaseInfo?.AreaName ?? '').toLowerCase().includes(name)
      );
    });
  }

  toggleAccessLevel(id: string | null | undefined): void {
    if (!id) return;
    if (this.selectedAccessLevelIds.has(id)) this.selectedAccessLevelIds.delete(id);
    else this.selectedAccessLevelIds.add(id);
  }

  private toHikCentralIso(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const offsetMin = -date.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const offH = pad(Math.floor(Math.abs(offsetMin) / 60));
    const offM = pad(Math.abs(offsetMin) % 60);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${offH}:${offM}`;
  }

  private errorMessage(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      return e.error?.message ?? e.error ?? e.message ?? 'Something went wrong.';
    }
    return String(e);
  }

  async submit(): Promise<void> {
    if (this.basicInfoForm.invalid || this.privateInfoForm.invalid) return;
    const orgIndexCode = this.resolvedOrgIndexCode;
    if (!orgIndexCode) {
      this.submitError = "This department isn't linked to a HikCentral organization yet — set it on the department's edit screen.";
      return;
    }

    this.submitting = true;
    this.submitError = null;
    const failures: string[] = [];

    try {
      const now = new Date();
      const tenYearsOut = new Date(now);
      tenYearsOut.setFullYear(tenYearsOut.getFullYear() + 10);

      const b = this.basicInfoForm.value;
      const p = this.privateInfoForm.value;

      const personId = await this.api.createHikCentralPerson({
        personCode: b.personCode!,
        personFamilyName: b.lastName!,
        personGivenName: b.firstName!,
        orgIndexCode,
        gender: p.gender ?? null,
        phoneNo: p.phoneNo || null,
        email: p.email || null,
        remark: p.remark || null,
        beginTime: this.toHikCentralIso(now),
        endTime: this.toHikCentralIso(tenYearsOut),
      }).then(r => r.personId);

      for (const privilegeGroupId of this.selectedAccessLevelIds) {
        try {
          await this.api.assignHikCentralAccessLevel(privilegeGroupId, personId);
        } catch (e) {
          const level = this.accessLevels.find(l => l.privilegeGroupId === privilegeGroupId);
          failures.push(`${level?.privilegeGroupName ?? privilegeGroupId}: ${this.errorMessage(e)}`);
        }
      }

      this.dialogRef.close({
        created: true,
        failures,
      });
    } catch (e) {
      this.submitError = this.errorMessage(e);
    } finally {
      this.submitting = false;
    }
  }
}
