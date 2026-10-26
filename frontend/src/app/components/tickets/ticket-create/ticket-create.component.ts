import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container" style="max-width: 800px;">
      <div class="header-row">
        <div>
          <h1>Nueva Solicitud de Asistencia</h1>
          <p class="subtitle">Registra tu problema técnico para que nuestro equipo lo asigne y atienda.</p>
        </div>
        <a routerLink="/tickets" class="btn btn-outline">Volver a Solicitudes</a>
      </div>

      @if (errorMessage) {
        <div class="alert alert-danger">
          <span>⚠️</span>
          <span>{{ errorMessage }}</span>
        </div>
      }

      <div class="card">
        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label" for="title">Título del Problema *</label>
            <input
              id="title"
              type="text"
              [(ngModel)]="title"
              name="title"
              required
              minlength="5"
              maxlength="150"
              placeholder="Ej: Impresora de la oficina no responde o error al iniciar Excel"
              class="form-control"
            />
            <small class="text-muted">Sé claro y específico (mínimo 5 caracteres).</small>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="form-group">
              <label class="form-label" for="category">Categoría del Problema *</label>
              <select id="category" [(ngModel)]="category" name="category" required class="form-select">
                <option value="hardware">Hardware (Computadoras, Monitores, Impresoras)</option>
                <option value="software">Software (Programas, Office, Antivirus, Errores)</option>
                <option value="red">Red e Internet (Wi-Fi, Conexión lenta, Cable)</option>
                <option value="acceso">Acceso y Seguridad (Claves, Permisos, VPN)</option>
                <option value="otro">Otro Incidente General</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="priority">Nivel de Prioridad *</label>
              <select id="priority" [(ngModel)]="priority" name="priority" required class="form-select">
                <option value="baja">Baja (No impide el trabajo diario)</option>
                <option value="media">Media (Afecta parcialmente una tarea)</option>
                <option value="alta">Alta (Impide el desarrollo normal de tareas)</option>
                <option value="critica">Crítica (Servicio o sector completamente detenido)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="description">Descripción Detallada *</label>
            <textarea
              id="description"
              [(ngModel)]="description"
              name="description"
              required
              minlength="10"
              maxlength="5000"
              rows="6"
              placeholder="Explica qué estaba sucediendo, mensajes de error que aparecieron en pantalla o pasos para reproducir el fallo..."
              class="form-control"
            ></textarea>
            <small class="text-muted">Proporciona detalles útiles para que el técnico prepare una solución rápida (mínimo 10 caracteres).</small>
          </div>

          <div class="flex justify-between items-center" style="margin-top: 1.5rem;">
            <a routerLink="/tickets" class="btn btn-secondary">Cancelar</a>
            <button type="submit" [disabled]="loading" class="btn btn-primary">
              @if (loading) {
                <span>Registrando solicitud...</span>
              } @else {
                <span>Crear Solicitud</span>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
  `]
})
export class TicketCreateComponent {
  title = '';
  category = 'software';
  priority = 'media';
  description = '';
  loading = false;
  errorMessage = '';

  private ticketService = inject(TicketService);
  private router = inject(Router);

  onSubmit(): void {
    if (!this.title.trim() || !this.description.trim()) {
      this.errorMessage = 'Por favor completa todos los campos obligatorios.';
      return;
    }

    if (this.title.trim().length < 5) {
      this.errorMessage = 'El título debe tener al menos 5 caracteres.';
      return;
    }

    if (this.description.trim().length < 10) {
      this.errorMessage = 'La descripción debe tener al menos 10 caracteres.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.ticketService.createTicket({
      title: this.title.trim(),
      category: this.category,
      priority: this.priority,
      description: this.description.trim(),
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.router.navigate(['/tickets']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Error al registrar la solicitud.';
      }
    });
  }
}
