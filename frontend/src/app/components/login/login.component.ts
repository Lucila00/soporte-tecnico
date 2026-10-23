import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <div class="brand-icon">🛠️</div>
          <h2>Sistema de Gestión de Soporte</h2>
          <p class="subtitle">Inicia sesión con tu cuenta para acceder al sistema</p>
        </div>

        @if (errorMessage) {
          <div class="alert alert-danger">
            <span>⚠️</span>
            <span>{{ errorMessage }}</span>
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label class="form-label" for="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              class="form-control"
              placeholder="ejemplo@soporte.local"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Contraseña</label>
            <input
              id="password"
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              class="form-control"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" [disabled]="loading" class="btn btn-primary btn-block">
            @if (loading) {
              <span>Iniciando sesión...</span>
            } @else {
              <span>Ingresar al Sistema</span>
            }
          </button>
        </form>

        <div class="demo-section">
          <p class="demo-title">Acceso Rápido para Demostración Académica:</p>
          <div class="demo-buttons">
            <button type="button" (click)="fillCredentials('admin@soporte.local', 'Admin123!')" class="btn btn-sm btn-outline">
              👑 Administrador
            </button>
            <button type="button" (click)="fillCredentials('operador@soporte.local', 'Operador123!')" class="btn btn-sm btn-outline">
              🔧 Operador
            </button>
            <button type="button" (click)="fillCredentials('usuario@soporte.local', 'Usuario123!')" class="btn btn-sm btn-outline">
              👤 Cliente (Lucía)
            </button>
            <button type="button" (click)="fillCredentials('carlos@soporte.local', 'Usuario123!')" class="btn btn-sm btn-outline">
              👤 Cliente 2 (Carlos)
            </button>
            <button type="button" (click)="fillCredentials('bloqueado@soporte.local', 'Bloqueado123!')" class="btn btn-sm btn-outline">
              🚫 Cuenta Bloqueada
            </button>
          </div>
        </div>

        <div class="security-note">
          <small>
            🛡️ <strong>Seguridad activa:</strong> Sesiones seguras HttpOnly con Laravel Sanctum, protección CSRF y limitación de 5 intentos fallidos (Anti-Brute Force).
          </small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: calc(100vh - 70px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .login-card {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      max-width: 460px;
      width: 100%;
      padding: 2.25rem;
    }
    .login-header {
      text-align: center;
      margin-bottom: 1.75rem;
    }
    .brand-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    .btn-block {
      width: 100%;
      padding: 0.75rem;
      margin-top: 0.5rem;
    }
    .demo-section {
      margin-top: 1.75rem;
      padding-top: 1.25rem;
      border-top: 1px dashed var(--border-color);
    }
    .demo-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.625rem;
      text-align: center;
    }
    .demo-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      justify-content: center;
    }
    .security-note {
      margin-top: 1.25rem;
      padding: 0.625rem;
      background-color: var(--bg-main);
      border-radius: var(--radius-sm);
      text-align: center;
      color: var(--text-muted);
    }
  `]
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.authService.clearSession();
  }

  fillCredentials(email: string, pass: string): void {
    this.email = email;
    this.password = pass;
    this.errorMessage = '';
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor ingresa correo y contraseña.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 429) {
          this.errorMessage = err.error?.message || 'Demasiados intentos fallidos. Por seguridad, espera 1 minuto.';
        } else if (err.status === 403) {
          this.errorMessage = err.error?.message || 'Esta cuenta ha sido desactivada por el administrador.';
        } else if (err.status === 422) {
          this.errorMessage = err.error?.message || 'Credenciales incorrectas.';
        } else {
          this.errorMessage = 'Error de conexión con el servidor de autenticación.';
        }
      }
    });
  }
}
