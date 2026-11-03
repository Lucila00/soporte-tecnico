import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AuditLog, PaginatedAuditLogs } from '../../../models/audit.model';

@Component({
  selector: 'app-audit-logs',
  // Angular 22 usa OnPush por defecto; el estado se guarda en propiedades simples
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="container">
      <div class="header-row">
        <div>
          <h1>📜 Registros de Auditoría del Sistema</h1>
          <p class="subtitle">Trazabilidad inmutable de eventos sensibles, accesos no autorizados y cambios administrativos.</p>
        </div>
      </div>

      <div class="card filter-card">
        <div class="flex gap-4 items-center">
          <select [(ngModel)]="filterAction" (change)="loadLogs()" class="form-select" style="max-width: 320px;">
            <option value="">Todas las Acciones</option>
            <option value="LOGIN_SUCCESS">Inicio de Sesión Exitoso</option>
            <option value="LOGIN_FAILED">Intento de Acceso Fallido</option>
            <option value="IDOR_ACCESS_ATTEMPT">Intento de Acceso IDOR</option>
            <option value="ROLE_CHANGED">Cambio de Rol</option>
            <option value="USER_DEACTIVATED">Cuenta Desactivada</option>
            <option value="TICKET_CREATED">Ticket Creado</option>
            <option value="TICKET_STATUS_CHANGED">Cambio de Estado Ticket</option>
            <option value="TICKET_DELETED">Ticket Eliminado</option>
          </select>
          <button (click)="loadLogs()" class="btn btn-primary btn-sm">Actualizar</button>
        </div>
      </div>

      <div class="card">
        @if (loading) {
          <div class="text-center" style="padding: 2rem;">
            <p>Cargando registros de auditoría...</p>
          </div>
        } @else if (logs.length === 0) {
          <div class="text-center" style="padding: 2rem;">
            <p class="text-muted">No se registran eventos con los filtros seleccionados.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Usuario</th>
                  <th>Evento / Acción</th>
                  <th>Dirección IP</th>
                  <th>Detalles Técnicos</th>
                </tr>
              </thead>
              <tbody>
                @for (log of logs; track log.id) {
                  <tr>
                    <td style="white-space: nowrap;">{{ log.created_at | date:'medium' }}</td>
                    <td>
                      @if (log.user) {
                        <strong>{{ log.user.name }}</strong>
                        <div class="user-sub">{{ log.user.email }}</div>
                      } @else {
                        <span class="text-muted">No autenticado</span>
                      }
                    </td>
                    <td>
                      <span class="badge" [class]="getActionBadgeClass(log.action)">
                        {{ log.action }}
                      </span>
                    </td>
                    <td><code>{{ log.ip_address || '127.0.0.1' }}</code></td>
                    <td class="details-col">
                      @if (log.details) {
                        <pre class="json-preview">{{ log.details | json }}</pre>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          @if (totalPages > 1) {
            <div class="pagination-bar">
              <span>Página {{ currentPage }} de {{ totalPages }} (Total: {{ totalItems }} eventos registrados)</span>
              <div class="pagination-buttons">
                <button [disabled]="currentPage <= 1" (click)="changePage(currentPage - 1)" class="btn btn-sm btn-secondary">
                  Anterior
                </button>
                <button [disabled]="currentPage >= totalPages" (click)="changePage(currentPage + 1)" class="btn btn-sm btn-secondary">
                  Siguiente
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .header-row {
      margin-bottom: 1.5rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    .filter-card {
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
    }
    .user-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .details-col {
      max-width: 320px;
    }
    .json-preview {
      font-size: 0.75rem;
      background: #f1f5f9;
      padding: 0.375rem 0.5rem;
      border-radius: var(--radius-sm);
      max-height: 80px;
      overflow-y: auto;
      white-space: pre-wrap;
      font-family: monospace;
    }
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-color);
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .pagination-buttons {
      display: flex;
      gap: 0.5rem;
    }
  `]
})
export class AuditLogsComponent implements OnInit {
  private adminService = inject(AdminService);

  logs: AuditLog[] = [];
  loading = true;
  filterAction = '';
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.adminService.getAuditLogs({
      action: this.filterAction || undefined,
      page: this.currentPage,
    }).subscribe({
      next: (res: PaginatedAuditLogs) => {
        this.logs = res.data;
        this.currentPage = res.current_page;
        this.totalPages = res.last_page;
        this.totalItems = res.total;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadLogs();
  }

  getActionBadgeClass(action: string): string {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return 'badge-resuelto';
      case 'LOGIN_FAILED':
      case 'LOGIN_BLOCKED_INACTIVE':
      case 'IDOR_ACCESS_ATTEMPT':
        return 'badge-critica';
      case 'ROLE_CHANGED':
      case 'USER_DEACTIVATED':
        return 'badge-alta';
      case 'TICKET_CREATED':
      case 'TICKET_STATUS_CHANGED':
        return 'badge-abierto';
      default:
        return 'badge-media';
    }
  }
}
