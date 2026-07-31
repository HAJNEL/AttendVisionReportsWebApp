import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { map, shareReplay, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterModule, MatSidenavModule, MatToolbarModule, MatButtonModule, MatIconModule, SidebarComponent],
  providers: [SessionService],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  isHandset$: Observable<boolean>;

  constructor(
    private breakpointObserver: BreakpointObserver,
    private sessionService: SessionService,
  ) {
    this.isHandset$ = this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(
        map(result => result.matches),
        shareReplay(),
      );
  }

  ngOnInit(): void {
    this.sessionService.start();
  }

  ngOnDestroy(): void {
    this.sessionService.stop();
  }

  onNavClicked(sidenav: MatSidenav): void {
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(take(1))
      .subscribe(result => { if (result.matches) sidenav.close(); });
  }
}
