import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { TicketService } from '../../../services/ticket.service';
import { AdminService } from '../../../services/admin.service';
import { Ticket } from '../../../models/ticket.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  template: `
    <div class="container" style="max-width: 950px;">
      <!-- Alerta de Bloqueo IDOR -->
      @if (idorBlocked) {
        <div class="card idor-card">
          <div class="idor-icon">🛡️</div>
          <h2>Acceso Denegado — Protección Anti-IDOR Activa</h2>
          <p class="idor-msg">
            Has intentado consultar una solicitud que pertenece a otro usuario sin tener privilegios de soporte técnico o administración.
          </p>
          <div class="idor-tech-box">
            <strong>Mecanismo de seguridad involucrado:</strong>
            <code>Laravel Policy (TicketPolicy::view) -> HTTP 403 Forbidden</code>
            <p>El backend comprobó que tu identificador de usuario no coincide con el dueño del ticket (<code>ticket.user_id !== auth()->id()</code>) y registró el intento en <code>audit_logs</code>.</p>
          </div>
          <a routerLink="/tickets" class="btn btn-primary" style="margin-top: 1rem;">Volver a mis solicitudes</a>
        </div>
      } @else if (loading) {
        <div class="card text-center" style="padding: 2.5rem;">
          <p>Cargando información de la solicitud...</p>
        </div>
      } @else if (ticket) {
        <div class="header-row">
          <div>
            <div class="flex items-center gap-2">
              <h1>{{ ticket.ticket_code }}</h1>
              <span class="badge" [class]="'badge-' + ticket.status">{{ (ticket.status || '').replace('_', ' ') }}</span>
              <span class="badge" [class]="'badge-' + ticket.priority">Prioridad {{ ticket.priority }}</span>
            </div>
            <p class="subtitle">Registrado el {{ ticket.created_at | date:'medium' }}</p>
          </div>
          <div class="flex gap-2">
            <a routerLink="/tickets" class="btn btn-outline">Volver a la lista</a>
            @if (authService.isAdmin()) {
              <button (click)="onDeleteTicket()" class="btn btn-danger btn-sm">Eliminar Solicitud</button>
            }
          </div>
        </div>

        @if (feedbackMessage) {
          <div class="alert alert-success">
            <span>✅</span>
            <span>{{ feedbackMessage }}</span>
          </div>
        }
        @if (errorMessage) {
          <div class="alert alert-danger">
            <span>⚠️</span>
            <span>{{ errorMessage }}</span>
          </div>
        }

        <!-- Tarjeta Principal de Información -->
        <div class="card">
          <div class="grid grid-cols-2 gap-4 meta-bar">
            <div>
              <span class="meta-label">Solicitante:</span>
              <strong>{{ ticket.creator?.name }}</strong> ({{ ticket.creator?.email }})
            </div>
            <div>
              <span class="meta-label">Técnico Asignado:</span>
              @if (ticket.assignee) {
                <strong class="text-primary">👨‍💻 {{ ticket.assignee.name }}</strong>
              } @else {
                <span class="text-muted">Sin asignar aún</span>
              }
            </div>
          </div>

          <div class="ticket-body">
            @if (!editMode) {
              <div class="flex justify-between items-center">
                <h2>{{ ticket.title }}</h2>
                @if (canEdit()) {
                  <button (click)="editMode = true" class="btn btn-sm btn-outline">Editar Solicitud</button>
                }
              </div>
              <p class="ticket-description">{{ ticket.description }}</p>
            } @else {
              <!-- Modo Edición -->
              <div class="edit-box">
                <div class="form-group">
                  <label class="form-label">Título</label>
                  <input type="text" [(ngModel)]="editTitle" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Descripción</label>
                  <textarea [(ngModel)]="editDescription" rows="4" maxlength="5000" class="form-control"></textarea>
                </div>
                <div class="flex gap-2">
                  <button (click)="saveEdit()" class="btn btn-sm btn-primary">Guardar Cambios</button>
                  <button (click)="editMode = false" class="btn btn-sm btn-secondary">Cancelar</button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Panel Operativo (Solo Operador o Administrador) -->
        @if (authService.isStaff()) {
          <div class="card staff-panel">
            <h3>⚙️ Gestión Operativa del Ticket (Personal Técnico)</h3>
            <div class="grid grid-cols-2 gap-4" style="margin-top: 1rem;">
              <div>
                <label class="form-label">Cambiar Estado:</label>
                <div class="flex gap-2">
                  <select [(ngModel)]="selectedStatus" class="form-select">
                    <option value="abierto">Abierto</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="resuelto">Resuelto</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                  <button (click)="updateStatus()" class="btn btn-sm btn-primary">Actualizar</button>
                </div>
              </div>

              <div>
                <label class="form-label">Reasignar Técnico:</label>
                <div class="flex gap-2">
                  <select [(ngModel)]="selectedAssignee" class="form-select">
                    <option [ngValue]="null">-- Sin Asignar --</option>
                    @for (op of operators; track op.id) {
                      <option [ngValue]="op.id">{{ op.name }} ({{ op.role?.name }})</option>
                    }
                  </select>
                  <button (click)="updateAssignee()" class="btn btn-sm btn-primary">Asignar</button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Historial de Observaciones y Comentarios -->
        <div class="card">
          <div class="card-header">
            <h3>💬 Historial de Seguimiento y Comentarios</h3>
            <span class="badge badge-secondary">{{ ticket.comments?.length || 0 }} comentarios</span>
          </div>

          <div class="comments-list">
            @if (!ticket.comments || ticket.comments.length === 0) {
              <p class="text-muted text-center" style="padding: 1.5rem;">No hay observaciones registradas en este ticket.</p>
            } @else {
              @for (c of ticket.comments; track c.id) {
                <div class="comment-item" [class.internal-comment]="c.is_internal">
                  <div class="comment-header">
                    <div class="flex items-center gap-2">
                      <strong>{{ c.user?.name || 'Usuario' }}</strong>
                      @if (c.user?.role) {
                        <span class="badge" [class]="'badge-' + c.user.role.name">{{ c.user.role.name }}</span>
                      }
                      @if (c.is_internal) {
                        <span class="badge badge-alta">🔒 Nota Interna de Soporte</span>
                      }
                    </div>
                    <span class="comment-date">{{ c.created_at | date:'short' }}</span>
                  </div>
                  <p class="comment-text">{{ c.comment }}</p>
                </div>
              }
            }
          </div>

          <!-- Formulario para agregar comentario -->
          @if (ticket.status !== 'cerrado' || authService.isStaff()) {
            <div class="add-comment-box">
              <label class="form-label">Agregar Observación o Respuesta:</label>
              <textarea
                [(ngModel)]="newComment"
                maxlength="2000"
                rows="3"
                placeholder="Escribe tu observación técnica o respuesta al usuario..."
                class="form-control"
              ></textarea>

              <div class="comment-form-actions">
                @if (authService.isStaff()) {
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="isInternalComment" />
                    <span>Marcar como Nota Interna (oculta para el cliente)</span>
                  </label>
                } @else {
                  <div></div>
                }

                <button
                  (click)="submitComment()"
                  [disabled]="!newComment.trim() || submittingComment"
                  class="btn btn-sm btn-primary"
                >
                  Enviar Comentario
                </button>
              </div>
            </div>
          } @else {
            <p class="text-muted text-center" style="margin-top: 1rem;">
              🔒 Esta solicitud está cerrada. No se admiten nuevos comentarios.
            </p>
          }
        </div>
      }
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
    .meta-bar {
      padding-bottom: 1rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
      font-size: 0.875rem;
    }
    .meta-label {
      color: var(--text-muted);
      display: inline-block;
      margin-right: 0.25rem;
    }
    .ticket-description {
      font-size: 0.9375rem;
      line-height: 1.6;
      margin-top: 0.75rem;
      white-space: pre-wrap;
    }
    .staff-panel {
      background-color: #f8fafc;
      border-color: #cbd5e1;
    }
    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .comment-item {
      background-color: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 1rem;
    }
    .internal-comment {
      background-color: #fffbeb;
      border-color: #fde68a;
    }
    .comment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .comment-date {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .comment-text {
      font-size: 0.875rem;
      white-space: pre-wrap;
    }
    .add-comment-box {
      border-top: 1px solid var(--border-color);
      padding-top: 1.25rem;
    }
    .comment-form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.75rem;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: var(--warning-text);
      cursor: pointer;
    }
    .idor-card {
      text-align: center;
      padding: 2.5rem;
      border: 2px solid var(--danger);
      background-color: var(--danger-light);
    }
    .idor-icon {
      font-size: 3rem;
      margin-bottom: 0.75rem;
    }
    .idor-msg {
      font-size: 1rem;
      color: var(--danger-text);
      margin-bottom: 1rem;
    }
    .idor-tech-box {
      background: white;
      border: 1px dashed var(--danger);
      border-radius: var(--radius-sm);
      padding: 1rem;
      font-size: 0.8125rem;
      text-align: left;
      margin: 1rem auto;
      max-width: 600px;
    }
    .idor-tech-box code {
      display: block;
      color: var(--danger-text);
      font-weight: 700;
      margin: 0.25rem 0;
    }
  `]
})
export class TicketDetailComponent implements OnInit {
  authService = inject(AuthService);
  private ticketService = inject(TicketService);
  private adminService = inject(AdminService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ticket: Ticket | null = null;
  operators: User[] = [];
  loading = true;
  idorBlocked = false;

  feedbackMessage = '';
  errorMessage = '';

  // Modo edición
  editMode = false;
  editTitle = '';
  editDescription = '';

  // Controles de Staff
  selectedStatus = '';
  selectedAssignee: number | null = null;

  // Nuevo comentario
  newComment = '';
  isInternalComment = false;
  submittingComment = false;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/tickets']);
      return;
    }

    if (this.route.snapshot.queryParamMap.get('created') === 'true') {
      this.feedbackMessage = '¡Solicitud registrada con éxito en el sistema!';
    }

    this.loadTicket(id);

    if (this.authService.isStaff()) {
      this.loadOperators();
    }
  }

  loadTicket(id: number): void {
    this.loading = true;
    this.idorBlocked = false;
    this.errorMessage = '';

    this.ticketService.getTicket(id).subscribe({
      next: (t) => {
        this.ticket = t;
        this.selectedStatus = t.status;
        this.selectedAssignee = t.assigned_to;
        this.editTitle = t.title;
        this.editDescription = t.description;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 403) {
          // Bloqueo IDOR detectado y demostrado
          this.idorBlocked = true;
        } else {
          this.errorMessage = 'No se pudo cargar la solicitud o no existe.';
        }
      }
    });
  }

  loadOperators(): void {
    this.adminService.getOperators().subscribe({
      next: (ops) => {
        this.operators = ops;
      }
    });
  }

  canEdit(): boolean {
    if (!this.ticket) return false;
    if (this.authService.isAdmin()) return true;
    return this.authService.currentUser()?.id === this.ticket.user_id && this.ticket.status === 'abierto';
  }

  saveEdit(): void {
    if (!this.ticket) return;

    this.ticketService.updateTicket(this.ticket.id, {
      title: this.editTitle,
      description: this.editDescription,
    }).subscribe({
      next: (res) => {
        this.ticket = res.ticket;
        this.editMode = false;
        this.feedbackMessage = 'Solicitud actualizada correctamente.';
        setTimeout(() => this.feedbackMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al actualizar la solicitud.';
      }
    });
  }

  updateStatus(): void {
    if (!this.ticket) return;

    this.ticketService.updateTicket(this.ticket.id, {
      status: this.selectedStatus,
    }).subscribe({
      next: (res) => {
        this.ticket = res.ticket;
        this.feedbackMessage = `Estado actualizado a "${this.selectedStatus}".`;
        setTimeout(() => this.feedbackMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al cambiar estado.';
      }
    });
  }

  updateAssignee(): void {
    if (!this.ticket) return;

    this.ticketService.updateTicket(this.ticket.id, {
      assigned_to: this.selectedAssignee,
    }).subscribe({
      next: (res) => {
        this.ticket = res.ticket;
        this.feedbackMessage = 'Técnico asignado correctamente.';
        setTimeout(() => this.feedbackMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al asignar técnico.';
      }
    });
  }

  submitComment(): void {
    if (!this.ticket || !this.newComment.trim()) return;

    this.submittingComment = true;
    this.errorMessage = '';

    this.ticketService.addComment(this.ticket.id, this.newComment.trim(), this.isInternalComment).subscribe({
      next: (res) => {
        if (!this.ticket!.comments) {
          this.ticket!.comments = [];
        }
        this.ticket!.comments.push(res.comment);
        this.newComment = '';
        this.isInternalComment = false;
        this.submittingComment = false;
        this.feedbackMessage = 'Comentario registrado con éxito.';
        setTimeout(() => this.feedbackMessage = '', 3000);
      },
      error: (err) => {
        this.submittingComment = false;
        this.errorMessage = err.error?.message || 'Error al enviar el comentario.';
      }
    });
  }

  onDeleteTicket(): void {
    if (!this.ticket) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente la solicitud ${this.ticket.ticket_code}? Esta acción quedará registrada en auditoría.`)) {
      return;
    }

    this.ticketService.deleteTicket(this.ticket.id).subscribe({
      next: () => {
        alert('Solicitud eliminada con éxito.');
        this.router.navigate(['/tickets']);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al eliminar solicitud.';
      }
    });
  }
}
