import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, switchMap, of, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Estado reactivo del usuario autenticado mediante Signals
  private currentUserSignal = signal<User | null>(this.getStoredUser());

  // Señales computadas para control de acceso y UI reactiva
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  readonly isAdmin = computed(() => this.currentUserSignal()?.role?.name === 'administrador');
  readonly isOperator = computed(() => this.currentUserSignal()?.role?.name === 'operador');
  readonly isUser = computed(() => this.currentUserSignal()?.role?.name === 'usuario');
  readonly isStaff = computed(() => this.isAdmin() || this.isOperator());

  /**
   * Inicio de sesión directo con Bearer Token.
   */
  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    this.clearSession();
    return this.http.post<AuthResponse>(`${environment.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('auth_token', response.token);
        }
        this.setUser(response.user);
      })
    );
  }

  /**
   * Cierre de sesión revocando token y limpiando almacenamiento local.
   */
  logout(): Observable<any> {
    return this.http.post(`${environment.apiUrl}/logout`, {}).pipe(
      catchError(() => of(null)), // Si falla la red, limpiar igualmente estado local
      tap(() => {
        this.clearSession();
        this.router.navigate(['/login']);
      })
    );
  }

  /**
   * Verifica y refresca el estado del usuario contra el backend.
   */
  checkAuth(): Observable<any> {
    return this.http.get<{ user: User }>(`${environment.apiUrl}/user`).pipe(
      tap(res => this.setUser(res.user)),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  /**
   * Actualizar perfil propio.
   */
  updateProfile(data: { name: string; current_password?: string; new_password?: string; new_password_confirmation?: string }): Observable<any> {
    return this.http.put(`${environment.apiUrl}/profile`, data).pipe(
      tap((res: any) => {
        if (res.user) {
          this.setUser(res.user);
        }
      })
    );
  }

  public getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  public setUser(user: User): void {
    this.currentUserSignal.set(user);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  public clearSession(): void {
    this.currentUserSignal.set(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  }

  private getStoredUser(): User | null {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}
