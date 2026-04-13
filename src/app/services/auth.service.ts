import { Injectable, signal } from '@angular/core';
import { ApiService, LoginResponse } from './api.service';

export type User = LoginResponse;

const STORAGE_KEY = 'auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<User | null>(this.loadFromStorage());

  readonly user = this.currentUser.asReadonly();

  constructor(private api: ApiService) {}

  async login(username: string, password: string): Promise<User> {
    const user = await this.api.login(username, password);
    this.currentUser.set(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  }

  async checkUsersExist(): Promise<boolean> {
    return this.api.checkUsersExist();
  }

  async registerFirstUser(data: {
    username: string;
    email: string;
    password: string;
    fullName?: string;
  }): Promise<User> {
    const user = await this.api.registerFirstUser(
      data.username, data.email, data.password, data.fullName ?? null
    );
    this.currentUser.set(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  private loadFromStorage(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
