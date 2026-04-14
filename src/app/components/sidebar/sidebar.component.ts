import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatListModule, MatIconModule, MatDividerModule],
  template: `
    <div class="sidebar-container">
      <div class="sidebar-header">
        <mat-icon>assessment</mat-icon>
        <span>AttendVision</span>
      </div>
      <mat-divider></mat-divider>
      <mat-nav-list>
        <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link" (click)="navClicked.emit()">
          <mat-icon matListItemIcon>dashboard</mat-icon>
          <span matListItemTitle>Dashboard</span>
        </a>
        <a mat-list-item routerLink="/reports" routerLinkActive="active-link" (click)="navClicked.emit()">
          <mat-icon matListItemIcon>description</mat-icon>
          <span matListItemTitle>Reports</span>
        </a>
        <a mat-list-item routerLink="/departments" routerLinkActive="active-link" (click)="navClicked.emit()">
          <mat-icon matListItemIcon>business</mat-icon>
          <span matListItemTitle>Departments</span>
        </a>
        <a mat-list-item routerLink="/companies" routerLinkActive="active-link" (click)="navClicked.emit()">
          <mat-icon matListItemIcon>apartment</mat-icon>
          <span matListItemTitle>Companies</span>
        </a>
        <a mat-list-item routerLink="/users" routerLinkActive="active-link" (click)="navClicked.emit()">
          <mat-icon matListItemIcon>people</mat-icon>
          <span matListItemTitle>Users</span>
        </a>
        <a mat-list-item routerLink="/roles" routerLinkActive="active-link" (click)="navClicked.emit()">
          <mat-icon matListItemIcon>security</mat-icon>
          <span matListItemTitle>Roles</span>
        </a>
        <a mat-list-item routerLink="/permissions" routerLinkActive="active-link" (click)="navClicked.emit()">
          <mat-icon matListItemIcon>vpn_key</mat-icon>
          <span matListItemTitle>Permissions</span>
        </a>
      </mat-nav-list>
      <div class="spacer"></div>
      <mat-divider></mat-divider>
      <mat-nav-list>
        <a mat-list-item (click)="onLogout()">
          <mat-icon matListItemIcon>logout</mat-icon>
          <span matListItemTitle>Logout</span>
        </a>
      </mat-nav-list>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      background: #161b22;
      border-right: 1px solid #30363d;
    }
    .sidebar-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .sidebar-header {
      padding: 24px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 20px;
      font-weight: 500;
      color: #58a6ff;
    }
    .sidebar-header mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #58a6ff;
    }
    .active-link {
      background: rgba(88, 166, 255, 0.12) !important;
      color: #58a6ff !important;
    }
    .active-link mat-icon {
      color: #58a6ff !important;
    }
    .spacer {
      flex: 1;
    }
    mat-nav-list a {
      color: #c9d1d9;
    }
    mat-nav-list a mat-icon {
      color: #8b949e;
    }
    mat-divider {
      border-top-color: #30363d !important;
    }
  `,
})
export class SidebarComponent {
  @Output() navClicked = new EventEmitter<void>();

  constructor(public authService: AuthService, private router: Router) {}

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
