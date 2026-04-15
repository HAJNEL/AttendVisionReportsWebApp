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
  templateUrl: './sidebar.component.html',
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
