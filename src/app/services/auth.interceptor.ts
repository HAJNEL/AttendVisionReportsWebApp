import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError, EMPTY } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('auth_token');
    let authReq = req;
    if (token) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }
    return next.handle(authReq).pipe(
      tap(event => {
        // Reset inactivity timer on every successful API response
        if (event instanceof HttpResponse) {
          this.auth.updateActivity();
        }
      }),
      catchError((err: any) => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          this.auth.logout();
          this.router.navigate(['/login']);
          return EMPTY; // swallow — no console error, no downstream handler fires
        }
        return throwError(() => err);
      })
    );
  }
}