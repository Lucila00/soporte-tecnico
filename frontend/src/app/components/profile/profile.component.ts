import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container" style="max-width: 750px;">
      <div class="header-row">
        <div>
          <h1>Mi Perfil de Usuario</h1>
          <p class="subtitle">Consulta tus datos personales y actualiza tu contraseña de acceso.</p>
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

      <!-- Resumen de Cuenta -->
      <div class="card">
        <h3>Información General</h3>
        <div class="grid grid-cols-2 gap-4" style="margin-top: 1rem;">
          <div>
            <span class="text-muted" style="font-size: 0.8125rem;">Correo Electrónico (No modificable)</span>
            <p><strong>{{ user?.email }}</strong></p>
          </div>
          <div>
            <span class="text-muted" style="font-size: 0.8125rem;">Rol Asignado</span>
            <p>
              <span class="badge" [class]="'badge-' + user?.role?.name">
                {{ user?.role?.name }}
              </span>
            </p>
          </div>
        </div>
      </div>

      <!-- Formulario de Actualización -->
      <div class="card">
        <h3>Editar Datos y Contraseña</h3>
        <form (ngSubmit)="onSubmit()" style="margin-top: 1rem;">
          <div class="form-group">
            <label class="form-label">Nombre Completo</label>
            <input type="text" [(ngModel)]="name" name="name" required class="form-control" />
          </div>

          <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid var(--border-color);" />

          <h4>Cambiar Contraseña (Opcional)</h4>
          <p class="subtitle" style="margin-bottom: 1rem;">Deja estos campos vacíos si no deseas modificar tu contraseña actual.</p>

          <div class="form-group">
            <label class="form-label">Contraseña Actual</label>
            <input
              type="password"
              [(ngModel)]="currentPassword"
              name="currentPassword"
              placeholder="Requerida para confirmar cambios de clave"
              class="form-control"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="form-group">
              <label class="form-label">Nueva Contraseña</label>
              <input
                type="password"
                [(ngModel)]="newPassword"
                name="newPassword"
                placeholder="Mínimo 8 caracteres"
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                [(ngModel)]="newPasswordConfirmation"
                name="newPasswordConfirmation"
                placeholder="Repite la nueva contraseña"
                class="form-control"
              />
            </div>
          </div>

          <div class="flex justify-between items-center" style="margin-top: 1rem;">
            <div></div>
            <button type="submit" [disabled]="loading" class="btn btn-primary">
              @if (loading) {
                <span>Guardando cambios...</span>
              } @else {
                <span>Guardar Cambios</span>
              }
            </button>
          </div>
        </form>
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
  `]
})
export class ProfileComponent implements OnInit {
  authService = inject(AuthService);

  user = this.authService.currentUser();
  name = '';
  currentPassword = '';
  newPassword = '';
  newPasswordConfirmation = '';

  loading = false;
  feedbackMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    if (this.user) {
      this.name = this.user.name;
    }
  }

  onSubmit(): void {
    if (!this.name.trim()) {
      this.errorMessage = 'El nombre no puede estar vacío.';
      return;
    }

    if (this.newPassword && this.newPassword !== this.newPasswordConfirmation) {
      this.errorMessage = 'La nueva contraseña y su confirmación no coinciden.';
      return;
    }

    if (this.newPassword && !this.currentPassword) {
      this.errorMessage = 'Debes ingresar tu contraseña actual para cambiarla.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const payload: any = { name: this.name.trim() };
    if (this.newPassword) {
      payload.current_password = this.currentPassword;
      payload.new_password = this.newPassword;
      payload.new_password_confirmation = this.newPasswordConfirmation;
    }

    this.authService.updateProfile(payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.user = res.user;
        this.currentPassword = '';
        this.newPassword = '';
        this.newPasswordConfirmation = '';
        this.feedbackMessage = 'Perfil actualizado con éxito.';
        setTimeout(() => this.feedbackMessage = '', 3000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Error al actualizar el perfil.';
      }
    });
  }
}
