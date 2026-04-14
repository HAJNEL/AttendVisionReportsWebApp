
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { Company } from '../../models/company.model';
import { CompanyFormDialogComponent, CompanyConfirmDialogComponent } from './company-dialog.component';

@Component({
  selector: 'app-companies',
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
    MatSnackBarModule
  ],
  templateUrl: './companies.component.html',
  styleUrls: ['./companies.component.scss'],
})
export class CompaniesComponent implements OnInit {
  displayedColumns = ['name', 'description', 'actions'];
  companies: Company[] = [];
  loading = true;
  error: string | null = null;

  constructor(private dialog: MatDialog, private snackBar: MatSnackBar, private api: ApiService) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      this.companies = await this.api.getCompanies();
    } catch (e) {
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }

  openCreate(): void {
    const ref = this.dialog.open(CompanyFormDialogComponent, {
      data: { company: null },
      width: '480px',
    });
    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        const created = await this.api.createCompany(result);
        this.companies = [...this.companies, created].sort((a, b) => a.name.localeCompare(b.name));
        this.snackBar.open('Company created', 'OK', { duration: 3000 });
      } catch (e) {
        this.snackBar.open(String(e), 'Dismiss', { duration: 5000 });
      }
    });
  }

  openEdit(company: Company): void {
    const ref = this.dialog.open(CompanyFormDialogComponent, {
      data: { company },
      width: '480px',
    });
    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        const updated = await this.api.updateCompany(company.id, result);
        // If API returns the updated company, use it; otherwise, update local object with dialog result
        const newCompany = updated ?? { ...company, ...result };
        this.companies = this.companies.map(c => c.id === company.id ? newCompany : c)
          .sort((a, b) => a.name.localeCompare(b.name));
        this.snackBar.open('Company saved', 'OK', { duration: 3000 });
      } catch (e) {
        this.snackBar.open(String(e), 'Dismiss', { duration: 5000 });
      }
    });
  }

  confirmDelete(company: Company): void {
    const ref = this.dialog.open(CompanyConfirmDialogComponent, {
      data: { name: company.name },
      width: '400px',
    });
    ref.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) return;
      try {
        await this.api.deleteCompany(company.id);
        this.companies = this.companies.filter(c => c.id !== company.id);
        this.snackBar.open('Company deleted', 'OK', { duration: 3000 });
      } catch (e) {
        this.snackBar.open(String(e), 'Dismiss', { duration: 5000 });
      }
    });
  }
}
