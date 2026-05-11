import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from './auth.service';
import { SessionExpiredDialogComponent } from '../components/session-expired-dialog/session-expired-dialog.component';

const CHECK_INTERVAL_MS = 60_000; // check every 60 seconds

@Injectable()
export class SessionService implements OnDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private activeDialog: MatDialogRef<SessionExpiredDialogComponent> | null = null;

  private readonly activityEvents = ['mousemove', 'keydown', 'click', 'touchstart'] as const;
  private readonly activityHandler = (): void => this.auth.updateActivity();

  constructor(
    private auth: AuthService,
    private router: Router,
    private dialog: MatDialog,
  ) {}

  /**
   * Start inactivity tracking.
   * If the user is authenticated but has no session_last_activity timestamp
   * (e.g. they cleared localStorage while the app was open, or reloaded after
   * the sessionStorage was lost), perform a silent logout immediately.
   */
  start(): void {
    if (!this.auth.isAuthenticated()) return;

    // Silent logout: authenticated signal says yes, but no stored details or no activity stamp
    if (!this.auth.hasStoredSession() || this.auth.isSessionExpired()) {
      this.silentLogout();
      return;
    }

    this.bindActivityListeners();
    this.intervalId = setInterval(() => this.tick(), CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.unbindActivityListeners();
  }

  /** Called by AuthInterceptor on every successful HTTP response. */
  updateActivity(): void {
    this.auth.updateActivity();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private tick(): void {
    if (!this.auth.isAuthenticated()) {
      this.stop();
      return;
    }
    // If localStorage keys have been removed while the app was open, silent logout
    if (!this.auth.hasStoredSession()) {
      this.silentLogout();
      return;
    }
    if (this.auth.isSessionExpired()) {
      this.triggerExpiry();
    }
  }

  private triggerExpiry(): void {
    this.stop();

    // Guard: don't open a second dialog if one is already showing
    if (this.activeDialog) return;

    this.activeDialog = this.dialog.open(SessionExpiredDialogComponent, {
      disableClose: true,
      width: '360px',
    });

    this.activeDialog.afterClosed().subscribe(() => {
      this.activeDialog = null;
      this.auth.logout();
      this.router.navigate(['/login']);
    });
  }

  private silentLogout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private bindActivityListeners(): void {
    this.activityEvents.forEach(event =>
      document.addEventListener(event, this.activityHandler, { passive: true }),
    );
  }

  private unbindActivityListeners(): void {
    this.activityEvents.forEach(event =>
      document.removeEventListener(event, this.activityHandler),
    );
  }
}
