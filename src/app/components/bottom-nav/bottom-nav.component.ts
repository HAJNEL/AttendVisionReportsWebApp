import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';

interface BottomNavItem {
  label: string;
  icon: string;
  route: string;
  permission: string;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatMenuModule, MatDividerModule],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  private readonly primaryItems: BottomNavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', permission: 'dashboard' },
    { label: 'Reports', icon: 'description', route: '/reports', permission: 'reports' },
    { label: 'Leave', icon: 'event_busy', route: '/employee-leave', permission: 'employee_leave' },
    { label: 'Time', icon: 'manage_history', route: '/time-management', permission: 'time_management' },
  ];

  private readonly secondaryItems: BottomNavItem[] = [
    { label: 'Departments', icon: 'business', route: '/departments', permission: 'departments' },
    { label: 'Companies', icon: 'apartment', route: '/companies', permission: 'companies' },
    { label: 'Users', icon: 'people', route: '/users', permission: 'users' },
    { label: 'Roles', icon: 'security', route: '/roles', permission: 'roles' },
    { label: 'Permissions', icon: 'vpn_key', route: '/permissions', permission: 'permissions' },
  ];

  constructor(public authService: AuthService, private router: Router) {}

  get visibleTabs(): BottomNavItem[] {
    return this.primaryItems.filter(i => this.authService.hasPermission(i.permission));
  }

  get visibleMoreItems(): BottomNavItem[] {
    return this.secondaryItems.filter(i => this.authService.hasPermission(i.permission));
  }

  get isMoreActive(): boolean {
    return this.secondaryItems.some(i => this.router.url.startsWith(i.route));
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
