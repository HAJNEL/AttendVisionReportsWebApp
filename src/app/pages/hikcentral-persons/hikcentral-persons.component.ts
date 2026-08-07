import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../services/api.service';
import { HikCentralPerson, HikCentralOrganization } from '../../models/hikcentral-person.model';
import { PersonFormDialogComponent, PersonConfirmDialogComponent } from './dialogs/person-dialog/person-dialog.component';
import { AddPersonWizardComponent } from './dialogs/add-person-wizard/add-person-wizard.component';

@Component({
  selector: 'app-hikcentral-persons',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatCardModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    FormsModule,
  ],
  templateUrl: './hikcentral-persons.component.html',
  styleUrl: './hikcentral-persons.component.scss',
})
export class HikCentralPersonsComponent implements OnInit {
  displayedColumns = ['personName', 'personCode', 'orgName', 'phoneNo', 'email', 'actions'];
  mobileColumns = ['personName', 'personCode', 'actions'];
  persons: HikCentralPerson[] = [];
  organizations: HikCentralOrganization[] = [];
  loading = true;
  error: string | null = null;
  isMobile = false;

  searchQuery = '';
  selectedOrgIndexCode: string | null = null;

  total = 0;
  pageNo = 1;
  pageSize = 20;

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private api: ApiService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.isMobile = window.innerWidth <= 600;
    this.displayedColumns = this.isMobile ? this.mobileColumns : ['personName', 'personCode', 'orgName', 'phoneNo', 'email', 'actions'];
    this.organizations = await this.api.getHikCentralOrganizations().then(d => d.list ?? []).catch(() => []);
    await this.load();
  }

  orgName(orgIndexCode: string | null | undefined): string {
    return this.organizations.find(o => o.orgIndexCode === orgIndexCode)?.orgName ?? '—';
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const data = await this.api.getHikCentralPersons(
        this.pageNo,
        this.pageSize,
        this.selectedOrgIndexCode,
        this.searchQuery.trim() || null,
      );
      this.persons = data.list ?? [];
      this.total = data.total;
    } catch (e) {
      this.error = this.errorMessage(e);
    } finally {
      this.loading = false;
    }
  }

  onSearchChange(): void {
    this.pageNo = 1;
    this.load();
  }

  onOrgFilterChange(): void {
    this.pageNo = 1;
    this.load();
  }

  onPage(event: PageEvent): void {
    this.pageNo = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.load();
  }

  private errorMessage(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      return e.error?.message ?? e.error ?? e.message ?? 'Something went wrong.';
    }
    return String(e);
  }

  openCreate(): void {
    const ref = this.dialog.open(AddPersonWizardComponent, {
      width: '640px',
      maxWidth: '96vw',
      disableClose: true,
    });
    ref.afterClosed().subscribe(async (result) => {
      if (!result?.created) return;
      if (result.failures?.length) {
        this.snackBar.open(
          `Person added, but ${result.failures.length} access level(s) failed to assign: ${result.failures.join('; ')}`,
          'Dismiss',
          { duration: 8000 },
        );
      } else {
        this.snackBar.open('Person added', 'OK', { duration: 3000 });
      }
      await this.load();
    });
  }

  openEdit(person: HikCentralPerson): void {
    const ref = this.dialog.open(PersonFormDialogComponent, {
      data: { person, organizations: this.organizations },
      width: '560px',
    });
    ref.afterClosed().subscribe(async (result) => {
      if (!result || !person.personId) return;
      try {
        await this.api.updateHikCentralPerson(person.personId, { personId: person.personId, ...result });
        this.snackBar.open('Person saved', 'OK', { duration: 3000 });
        await this.load();
      } catch (e) {
        this.snackBar.open(this.errorMessage(e), 'Dismiss', { duration: 5000 });
      }
    });
  }

  confirmDelete(person: HikCentralPerson): void {
    const ref = this.dialog.open(PersonConfirmDialogComponent, {
      data: { name: person.personName ?? person.personCode ?? 'this person' },
      width: '400px',
    });
    ref.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed || !person.personId) return;
      try {
        await this.api.deleteHikCentralPerson(person.personId);
        this.snackBar.open('Person deleted', 'OK', { duration: 3000 });
        await this.load();
      } catch (e) {
        this.snackBar.open(this.errorMessage(e), 'Dismiss', { duration: 5000 });
      }
    });
  }
}
