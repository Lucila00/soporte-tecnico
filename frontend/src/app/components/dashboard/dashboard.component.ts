import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardSummary } from '../../models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  template: `
    <div class="container">
      <div class="welcome-bar">
        <div>
          <h1>Hola, {{ authService.currentUser()?.name }} 👋</h1>
          <p class="subtitle">
            Panel de control — Rol:
            <span class="badge" [class]="'badge-' + authService.currentUser()?.role?.name">
              {{ authService.currentUser()?.role?.name }}
            </span>
          </p>
        </div>
        <div>
          <a routerLink="/tickets/new" class="btn btn-primary">+ Nueva Solicitud</a>
        </div>
      </div>

      @if (loading) {
        <div class="card text-center">
          <p>Cargando información del sistema...</p>
        </div>
      } @else if (summary) {
        <!-- Tarjetas de Métricas -->
        <div class="grid grid-cols-4 gap-4 stats-grid">
          <div class="stat-card">
            <span class="stat-title">Total Solicitudes</span>
            <span class="stat-value">{{ summary.total_tickets }}</span>
          </div>

          <div class="stat-card border-info">
            <span class="stat-title">Abiertas</span>
            <span class="stat-value text-info">{{ summary.abiertos }}</span>
          </div>

          <div class="stat-card border-warning">
            <span class="stat-title">En Proceso</span>
            <span class="stat-value text-warning">{{ summary.en_proceso }}</span>
          </div>

          <div class="stat-card border-success">
            <span class="stat-title">Resueltas</span>
            <span class="stat-value text-success">{{ summary.resueltos }}</span>
          </div>
        </div>

        @if (authService.isAdmin() && summary.total_users !== undefined) {
          <div class="card admin-stats-card">
            <h3>👥 Resumen de Usuarios del Sistema</h3>
            <div class="grid grid-cols-3 gap-4" style="margin-top: 1rem;">
              <div>
                <span class="stat-title">Total Usuarios</span>
                <p class="stat-value-sm">{{ summary.total_users }}</p>
              </div>
              <div>
                <span class="stat-title">Usuarios Activos</span>
                <p class="stat-value-sm text-success">{{ summary.active_users }}</p>
              </div>
              <div>
                <span class="stat-title">Cuentas Desactivadas</span>
                <p class="stat-value-sm text-danger">{{ summary.inactive_users }}</p>
              </div>
            </div>
          </div>
        }

        <!-- Solicitudes Recientes -->
        <div class="card">
          <div class="card-header">
            <h3>📋 Solicitudes Recientes</h3>
            <a routerLink="/tickets" class="btn btn-sm btn-outline">Ver Todas las Solicitudes</a>
          </div>

          @if (summary.recent_tickets.length === 0) {
            <p class="text-muted text-center" style="padding: 1.5rem;">No hay solicitudes registradas aún.</p>
          } @else {
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Título</th>
                    <th>Categoría</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of summary.recent_tickets; track t.id) {
                    <tr>
                      <td><strong>{{ t.ticket_code }}</strong></td>
                      <td>{{ t.title }}</td>
                      <td><span class="category-tag">{{ t.category }}</span></td>
                      <td><span class="badge" [class]="'badge-' + t.priority">{{ t.priority }}</span></td>
                      <td><span class="badge" [class]="'badge-' + t.status">{{ (t.status || '').replace('_', ' ') }}</span></td>
                      <td>{{ t.created_at | date:'shortDate' }}</td>
                      <td>
                        <a [routerLink]="['/tickets', t.id]" class="btn btn-sm btn-outline">Ver Detalle</a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .welcome-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    .stats-grid {
      margin-bottom: 1.5rem;
    }
    .stat-card {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .border-info { border-left: 4px solid var(--info); }
    .border-warning { border-left: 4px solid var(--warning); }
    .border-success { border-left: 4px solid var(--success); }
    .stat-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .stat-value {
      font-size: 1.875rem;
      font-weight: 700;
    }
    .stat-value-sm {
      font-size: 1.5rem;
      font-weight: 700;
      margin-top: 0.25rem;
    }
    .text-info { color: var(--info); }
    .text-warning { color: var(--warning); }
    .text-success { color: var(--success); }
    .text-danger { color: var(--danger); }
    .category-tag {
      text-transform: capitalize;
      font-weight: 500;
      color: var(--text-muted);
    }
    .admin-stats-card {
      background: #fdf4ff;
      border-color: #f0abfc;
    }
  `]
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private dashboardService = inject(DashboardService);

  summary: DashboardSummary | null = null;
  loading = true;

  ngOnInit(): void {
    this.dashboardService.getSummary().subscribe({
      next: (res) => {
        this.summary = res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
