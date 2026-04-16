import { Component, Inject, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSelectionList, MatListOption } from '@angular/material/list';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { User } from '../../../../models/user.model';
import { DepartmentUserLink } from '../../../../models/department-user-link.model';

export interface AssignDepartmentUsersDialogData {
  departmentId: string;
  departmentName?: string;
  assigned?: DepartmentUserLink[];
}

@Component({
  selector: 'app-assign-department-users-dialog',
  templateUrl: './assign-department-users-dialog.component.html',
  styleUrls: ['./assign-department-users-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatProgressBar,
    MatSelectionList,
    MatListOption,
    MatButtonModule,
    MatIconModule
  ],
})
export class AssignDepartmentUsersDialogComponent implements OnInit {
  allUsers: User[] = [];
  assignedIds = new Set<string>();
  loading = false;
  error: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<AssignDepartmentUsersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AssignDepartmentUsersDialogData,
    private apiService: ApiService
  ) {
    this.assignedIds = new Set((data.assigned || []).map(u => u.userId));
  }

  ngOnInit() {
    this.loading = true;
    Promise.all([
      firstValueFrom(this.apiService.getUsers()),
      this.apiService.getUsersForDepartment(this.data.departmentId)
    ]).then(([allUsers, assigned]: [User[], DepartmentUserLink[]]) => {
      this.allUsers = allUsers ?? [];
      this.assignedIds = new Set((assigned ?? []).map(u => u.userId));
      this.loading = false;
    }).catch(e => {
      this.error = String(e);
      this.loading = false;
    });
  }


  async onSave() {
    this.loading = true;
    this.error = null;
    try {
      // Get selected user IDs from the selection list
      const selectedUserIds = Array.from(this.assignedIds);
      const currentLinks = await this.apiService.getUsersForDepartment(this.data.departmentId);
      const currentUserIds = new Set(currentLinks.map(link => link.userId));

      // Find users to add and remove
      const toAdd = this.allUsers.filter(u => this.isUserSelected(u.id) && !currentUserIds.has(u.id));
      const toRemove = currentLinks.filter(link => !this.isUserSelected(link.userId));

      // Add new links
      for (const user of toAdd) {
        await this.apiService.createDepartmentUserLink({ departmentId: this.data.departmentId, userId: user.id });
      }
      // Remove unselected links
      for (const link of toRemove) {
        await this.apiService.deleteDepartmentUserLink(link.id);
      }
      this.dialogRef.close(true);
    } catch (e) {
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }

  isUserSelected(userId: string): boolean {
    // This method should check if the user is selected in the UI
    // For now, just check assignedIds
    return this.assignedIds.has(userId);
  }

    onSelectionChange(event: any) {
    // Update assignedIds based on selection
    const selectedIds = (event.source.selectedOptions.selected || []).map((opt: any) => opt.value);
    this.assignedIds = new Set(selectedIds);
  }

  onCancel() {
    this.dialogRef.close();
  }
}
