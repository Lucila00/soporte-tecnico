import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  // Angular 22 usa OnPush por defecto; el estado se guarda en propiedades simples
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="navbar">
      <div class="nav-container">
        <a routerLink="/dashboard" class="brand">
          <span class="brand-icon">🛠️</span>
          <span class="brand-text">Soporte<strong>TI</strong></span>
        </a>

        @if (authService.isAuthenticated()) {
          <nav class="nav-links">
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">Dashboard</a>
            <a routerLink="/tickets" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item">Solicitudes</a>
            <a routerLink="/tickets/new" routerLinkActive="active" class="nav-item">+ Nueva Solicitud</a>

            @if (authService.isAdmin()) {
              <a routerLink="/admin/users" routerLinkActive="active" class="nav-item">Usuarios</a>
              <a routerLink="/admin/audit-logs" routerLinkActive="active" class="nav-item">Auditoría</a>
            }
          </nav>

          <div class="user-menu">
            <a routerLink="/profile" class="user-info">
              <span class="user-name">{{ authService.currentUser()?.name }}</span>
              <span class="badge" [class]="'badge-' + authService.currentUser()?.role?.name">
                {{ authService.currentUser()?.role?.name }}
              </span>
            </a>
            <button (click)="logout()" class="btn btn-outline btn-sm logout-btn">Cerrar Sesión</button>
          </div>
        }
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      background-color: #ffffff;
      border-bottom: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.25rem;
      color: var(--text-main);
      font-weight: 500;
    }
    .brand strong {
      color: var(--primary);
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .nav-item {
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-muted);
      transition: all 0.15s ease;
    }
    .nav-item:hover {
      color: var(--text-main);
      background-color: var(--secondary-light);
    }
    .nav-item.active {
      color: var(--primary);
      background-color: var(--primary-light);
    }
    .user-menu {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
    .user-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-main);
    }
    .logout-btn {
      font-size: 0.75rem;
    }
  `]
})
export class NavbarComponent {
  authService = inject(AuthService);

  logout(): void {
    this.authService.logout().subscribe();
  }
}
