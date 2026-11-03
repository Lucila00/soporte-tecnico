import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { TicketService } from '../../../services/ticket.service';
import { PaginatedTickets, Ticket } from '../../../models/ticket.model';

@Component({
  selector: 'app-ticket-list',
  // Angular 22 usa OnPush por defecto; el estado se guarda en propiedades simples
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  template: `
    <div class="container">
      <div class="header-row">
        <div>
          <h1>Gestión de Solicitudes de Soporte</h1>
          <p class="subtitle">
            @if (authService.isUser()) {
              Mostrando únicamente tus solicitudes registradas (filtrado seguro en el servidor).
            } @else {
              Visualizando todas las solicitudes del sistema de soporte técnico.
            }
          </p>
        </div>
        <div class="flex gap-2">
          <button (click)="loadTickets()" class="btn btn-outline" title="Refrescar lista">🔄 Actualizar</button>
          <a routerLink="/tickets/new" class="btn btn-primary">+ Nueva Solicitud</a>
        </div>
      </div>

      <!-- Banner explicativo del Rol Activo -->
      <div class="alert" [class]="authService.isUser() ? 'alert-info' : (authService.isOperator() ? 'alert-warning' : 'alert-success')">
        <span style="font-size: 1.25rem;">
          @if (authService.isUser()) { 👤 } @else if (authService.isOperator()) { 🔧 } @else { 👑 }
        </span>
        <div>
          Conectado como: <strong>{{ authService.currentUser()?.name }}</strong> (Rol: <strong>{{ authService.currentUser()?.role?.name }}</strong>)
          <div style="font-size: 0.8125rem; margin-top: 0.15rem;">
            @if (authService.isUser()) {
              Estás en modo <strong>Cliente</strong>: la base de datos te muestra únicamente tus solicitudes propias.
            } @else if (authService.isOperator()) {
              Estás en modo <strong>Operador de Soporte</strong>: puedes ver y cambiar el estado de las solicitudes de todos los usuarios.
            } @else {
              Estás en modo <strong>Administrador</strong>: tienes control completo del sistema, usuarios y auditoría.
            }
          </div>
        </div>
      </div>

      <!-- Barra de Filtros -->
      <div class="card filter-card">
        <div class="filter-grid">
          <div>
            <label class="filter-label">Buscar</label>
            <input
              type="text"
              [(ngModel)]="search"
              (keyup.enter)="applyFilters()"
              placeholder="Código, título..."
              class="form-control"
            />
          </div>

          <div>
            <label class="filter-label">Estado</label>
            <select [(ngModel)]="status" (change)="applyFilters()" class="form-select">
              <option value="">Todos los Estados</option>
              <option value="abierto">Abierto</option>
              <option value="en_proceso">En Proceso</option>
              <option value="resuelto">Resuelto</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>

          <div>
            <label class="filter-label">Prioridad</label>
            <select [(ngModel)]="priority" (change)="applyFilters()" class="form-select">
              <option value="">Todas las Prioridades</option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>

          <div>
            <label class="filter-label">Categoría</label>
            <select [(ngModel)]="category" (change)="applyFilters()" class="form-select">
              <option value="">Todas las Categorías</option>
              <option value="hardware">Hardware</option>
              <option value="software">Software</option>
              <option value="red">Red</option>
              <option value="acceso">Acceso</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div class="filter-actions">
            <button (click)="applyFilters()" class="btn btn-primary btn-sm">Filtrar</button>
            <button (click)="resetFilters()" class="btn btn-secondary btn-sm">Limpiar</button>
          </div>
        </div>
      </div>

      <!-- Tabla de Solicitudes -->
      <div class="card">
        @if (loading) {
          <div class="text-center" style="padding: 2rem;">
            <p>Cargando solicitudes...</p>
          </div>
        } @else if (tickets.length === 0) {
          <div class="text-center" style="padding: 2.5rem;">
            <p class="text-muted">No se encontraron solicitudes con los filtros aplicados.</p>
          </div>
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
                  <th>Solicitante</th>
                  <th>Asignado a</th>
                  <th>Fecha</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                @for (t of tickets; track t.id) {
                  <tr>
                    <td><strong>{{ t.ticket_code }}</strong></td>
                    <td class="ticket-title-col">{{ t.title }}</td>
                    <td><span class="category-pill">{{ t.category }}</span></td>
                    <td><span class="badge" [class]="'badge-' + t.priority">{{ t.priority }}</span></td>
                    <td><span class="badge" [class]="'badge-' + t.status">{{ (t.status || '').replace('_', ' ') }}</span></td>
                    <td>{{ t.creator?.name || 'Usuario' }}</td>
                    <td>
                      @if (t.assignee) {
                        <span class="assigned-tech">👨‍💻 {{ t.assignee.name }}</span>
                      } @else {
                        <span class="text-muted">Sin asignar</span>
                      }
                    </td>
                    <td>{{ t.created_at | date:'shortDate' }}</td>
                    <td>
                      <a [routerLink]="['/tickets', t.id]" class="btn btn-sm btn-outline">Ver Detalle</a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          @if (totalPages > 1) {
            <div class="pagination-bar">
              <span>Página {{ currentPage }} de {{ totalPages }} (Total: {{ totalItems }} solicitudes)</span>
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
    .filter-card {
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
    }
    .filter-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr auto;
      gap: 0.75rem;
      align-items: flex-end;
    }
    @media (max-width: 900px) {
      .filter-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    .filter-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
      text-transform: uppercase;
    }
    .filter-actions {
      display: flex;
      gap: 0.5rem;
    }
    .ticket-title-col {
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .category-pill {
      text-transform: capitalize;
      font-size: 0.8125rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .assigned-tech {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--primary-dark);
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
export class TicketListComponent implements OnInit {
  authService = inject(AuthService);
  private ticketService = inject(TicketService);

  tickets: Ticket[] = [];
  loading = true;

  // Filtros
  search = '';
  status = '';
  priority = '';
  category = '';
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading = true;
    this.ticketService.getTickets({
      search: this.search,
      status: this.status,
      priority: this.priority,
      category: this.category,
      page: this.currentPage,
    }).subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.tickets = res;
          this.totalItems = res.length;
          this.totalPages = 1;
        } else if (res && Array.isArray(res.data)) {
          this.tickets = res.data;
          this.currentPage = res.current_page || 1;
          this.totalPages = res.last_page || 1;
          this.totalItems = res.total ?? res.data.length;
        } else {
          this.tickets = [];
          this.totalItems = 0;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando tickets:', err);
        this.tickets = [];
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadTickets();
  }

  resetFilters(): void {
    this.search = '';
    this.status = '';
    this.priority = '';
    this.category = '';
    this.currentPage = 1;
    this.loadTickets();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadTickets();
  }
}
