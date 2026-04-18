import { Component, Inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSelectionList, MatListOption } from '@angular/material/list';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { Department } from '../../../../models/department.model';
import { ApiService } from '../../../../services/api.service';
import { DepartmentUserLink } from '../../../../models/department-user-link.model';

export interface AssignDepartmentsDialogData {
  userId: string;
  userName?: string;
}

@Component({
  selector: 'app-assign-departments-dialog',
  templateUrl: './assign-departments-dialog.component.html',
  styleUrls: ['./assign-departments-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatProgressBar,
    MatSelectionList,
    MatListOption,
    MatButtonModule
  ],
})
export class AssignDepartmentsDialogComponent implements OnInit, AfterViewInit {
  @ViewChild(MatSelectionList) selectionList?: MatSelectionList;
  allDepartments: Department[] = [];
  assignedIds = new Set<string>();
  loading = false;
  error: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<AssignDepartmentsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AssignDepartmentsDialogData,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.loading = true;
    Promise.all([
      this.apiService.getAllDepartments(),
      this.apiService.getAllDepartmentUserLinks()
    ]).then(([departments, links]: [Department[], DepartmentUserLink[]]) => {
      console.log('[AssignDepartmentsDialog] Departments:', departments);
      console.log('[AssignDepartmentsDialog] DepartmentUserLinks:', links);
      this.allDepartments = departments ?? [];
      const assigned = links.filter((link: DepartmentUserLink) => link.userId === this.data.userId);
      this.assignedIds = new Set(assigned.map(link => link.departmentId));
      this.loading = false;
      setTimeout(() => this.updateSelectionList(), 0);
    }).catch(e => {
      this.error = 'Failed to load departments: ' + String(e);
      this.loading = false;
    });
  }

  ngAfterViewInit() {
    // In case departments load after view init
    setTimeout(() => this.updateSelectionList(), 0);
  }

  private updateSelectionList() {
    if (this.selectionList) {
      this.selectionList.options.forEach(option => {
        if (this.assignedIds.has(option.value)) {
          option.selected = true;
        } else {
          option.selected = false;
        }
      });
    }
  }

  onSelectionChange(event: any) {
    const selectedIds = (event.source.selectedOptions.selected || []).map((opt: any) => String(opt.value));
    this.assignedIds = new Set(selectedIds);
  }

  async onSave() {
    this.loading = true;
    this.error = null;
    try {
      const links = await this.apiService.getAllDepartmentUserLinks();
      const currentLinks = links.filter((link: DepartmentUserLink) => link.userId === this.data.userId);
      const currentDeptIds = new Set(currentLinks.map(link => link.departmentId));
      const toAdd = Array.from(this.assignedIds).filter(id => !currentDeptIds.has(id));
      const toRemove = currentLinks.filter((link: DepartmentUserLink) => !this.assignedIds.has(link.departmentId));
      for (const deptId of toAdd) {
        await this.apiService.createDepartmentUserLink({ departmentId: deptId, userId: this.data.userId });
      }
      for (const link of toRemove as DepartmentUserLink[]) {
        await this.apiService.deleteDepartmentUserLink(link.id);
      }
      this.dialogRef.close(true);
    } catch (e) {
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
