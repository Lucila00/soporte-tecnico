import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { Role, User } from '../../../models/user.model';

@Component({
  selector: 'app-admin-users',
  // Angular 22 usa OnPush por defecto; el estado se guarda en propiedades simples
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="header-row flex justify-between items-center">
        <div>
          <h1>👥 Administración de Usuarios</h1>
          <p class="subtitle">Gestión de roles y estado de cuentas del sistema (Exclusivo Administrador).</p>
        </div>
        @if (!showCreateForm) {
          <button (click)="openCreateForm()" class="btn btn-primary">+ Nuevo Usuario</button>
        }
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

      @if (showCreateForm) {
        <div class="card create-card">
          <h2 class="create-title">Crear Nuevo Usuario</h2>
          <form (ngSubmit)="createUser()">
            <div class="grid grid-cols-2 gap-4">
              <div class="form-group">
                <label class="form-label" for="new-name">Nombre Completo *</label>
                <input id="new-name" type="text" [(ngModel)]="newUser.name" name="name" required maxlength="100" class="form-control" />
                @if (createErrors['name']) {
                  <small class="form-error">{{ createErrors['name'] }}</small>
                }
              </div>

              <div class="form-group">
                <label class="form-label" for="new-email">Correo Electrónico *</label>
                <input id="new-email" type="email" [(ngModel)]="newUser.email" name="email" required maxlength="255" class="form-control" />
                @if (createErrors['email']) {
                  <small class="form-error">{{ createErrors['email'] }}</small>
                }
              </div>

              <div class="form-group">
                <label class="form-label" for="new-password">Contraseña *</label>
                <input id="new-password" type="password" [(ngModel)]="newUser.password" name="password" required minlength="8" autocomplete="new-password" class="form-control" />
                @if (createErrors['password']) {
                  <small class="form-error">{{ createErrors['password'] }}</small>
                } @else {
                  <small class="text-muted">Mínimo 8 caracteres.</small>
                }
              </div>

              <div class="form-group">
                <label class="form-label" for="new-password-confirmation">Confirmar Contraseña *</label>
                <input id="new-password-confirmation" type="password" [(ngModel)]="newUser.password_confirmation" name="password_confirmation" required autocomplete="new-password" class="form-control" />
              </div>

              <div class="form-group">
                <label class="form-label" for="new-role">Rol *</label>
                <select id="new-role" [(ngModel)]="newUser.role_id" name="role_id" required class="form-select">
                  <option [ngValue]="null" disabled>Seleccione un rol</option>
                  @for (r of roles; track r.id) {
                    <option [ngValue]="r.id">{{ r.name }}</option>
                  }
                </select>
                @if (createErrors['role_id']) {
                  <small class="form-error">{{ createErrors['role_id'] }}</small>
                }
              </div>

              <div class="form-group">
                <label class="form-label" for="new-active">Estado Inicial</label>
                <select id="new-active" [(ngModel)]="newUser.is_active" name="is_active" class="form-select">
                  <option [ngValue]="true">Activo</option>
                  <option [ngValue]="false">Desactivado</option>
                </select>
              </div>
            </div>

            <div class="flex gap-2">
              <button type="submit" class="btn btn-primary" [disabled]="creating">
                {{ creating ? 'Creando...' : 'Crear Usuario' }}
              </button>
              <button type="button" (click)="showCreateForm = false" class="btn btn-secondary" [disabled]="creating">Cancelar</button>
            </div>
          </form>
        </div>
      }

      <div class="card filter-card">
        <div class="flex gap-4 items-center">
          <input
            type="text"
            [(ngModel)]="search"
            (keyup.enter)="loadUsers()"
            placeholder="Buscar por nombre o correo..."
            class="form-control"
            style="max-width: 350px;"
          />
          <select [(ngModel)]="selectedRoleId" (change)="loadUsers()" class="form-select" style="max-width: 220px;">
            <option [ngValue]="null">Todos los Roles</option>
            @for (r of roles; track r.id) {
              <option [ngValue]="r.id">{{ r.name }}</option>
            }
          </select>
          <button (click)="loadUsers()" class="btn btn-primary btn-sm">Buscar</button>
        </div>
      </div>

      <div class="card">
        @if (loading) {
          <div class="text-center" style="padding: 2rem;">
            <p>Cargando usuarios...</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol Actual</th>
                  <th>Estado</th>
                  <th>Tickets Creados</th>
                  <th>Tickets Atendidos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (u of users; track u.id) {
                  <tr>
                    <td>{{ u.id }}</td>
                    <td><strong>{{ u.name }}</strong></td>
                    <td>{{ u.email }}</td>
                    <td>
                      @if (isSelf(u.id)) {
                        <span class="badge badge-admin">{{ u.role?.name }}</span>
                      } @else {
                        <select
                          [ngModel]="u.role_id"
                          (ngModelChange)="changeUserRole(u, $event)"
                          class="form-select form-select-sm"
                          style="width: 140px; display: inline-block;"
                        >
                          @for (r of roles; track r.id) {
                            <option [value]="r.id">{{ r.name }}</option>
                          }
                        </select>
                      }
                    </td>
                    <td>
                      @if (u.is_active) {
                        <span class="badge badge-resuelto">Activo</span>
                      } @else {
                        <span class="badge badge-critica">Desactivado</span>
                      }
                    </td>
                    <td>{{ u.created_tickets_count ?? 0 }}</td>
                    <td>{{ u.assigned_tickets_count ?? 0 }}</td>
                    <td>
                      @if (isSelf(u.id)) {
                        <small class="text-muted">Tu propia cuenta</small>
                      } @else {
                        @if (u.is_active) {
                          <button (click)="toggleActive(u, false)" class="btn btn-sm btn-danger">
                            Desactivar
                          </button>
                        } @else {
                          <button (click)="toggleActive(u, true)" class="btn btn-sm btn-success">
                            Activar
                          </button>
                        }
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
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
    .create-card {
      margin-bottom: 1.25rem;
    }
    .create-title {
      font-size: 1.125rem;
      margin-bottom: 1rem;
    }
    .filter-card {
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
    }
    .form-select-sm {
      padding: 0.25rem 0.5rem;
      font-size: 0.8125rem;
    }
  `]
})
export class AdminUsersComponent implements OnInit {
  authService = inject(AuthService);
  private adminService = inject(AdminService);

  users: User[] = [];
  roles: Role[] = [];
  loading = true;

  search = '';
  selectedRoleId: number | null = null;
  feedbackMessage = '';
  errorMessage = '';

  showCreateForm = false;
  creating = false;
  newUser = this.emptyNewUser();
  createErrors: Record<string, string> = {};

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  isSelf(userId: number): boolean {
    return this.authService.currentUser()?.id === userId;
  }

  loadRoles(): void {
    this.adminService.getRoles().subscribe({
      next: (roles) => this.roles = roles
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminService.getUsers({
      search: this.search,
      role_id: this.selectedRoleId || undefined,
    }).subscribe({
      next: (res) => {
        this.users = res.data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Error al cargar usuarios.';
      }
    });
  }

  openCreateForm(): void {
    this.newUser = this.emptyNewUser();
    this.createErrors = {};
    this.showCreateForm = true;
  }

  createUser(): void {
    this.createErrors = {};
    this.errorMessage = '';

    const { name, email, password, password_confirmation, role_id, is_active } = this.newUser;
    if (!name.trim() || !email.trim() || !password || role_id === null) {
      this.errorMessage = 'Completa todos los campos obligatorios.';
      return;
    }
    if (password !== password_confirmation) {
      this.createErrors['password'] = 'La confirmación de la contraseña no coincide.';
      return;
    }

    this.creating = true;
    this.adminService.createUser({
      name: name.trim(),
      email: email.trim(),
      password,
      password_confirmation,
      role_id,
      is_active,
    }).subscribe({
      next: (res) => {
        this.creating = false;
        this.showCreateForm = false;
        this.feedbackMessage = `Usuario ${res.user.name} creado con el rol ${res.user.role.name}.`;
        setTimeout(() => this.feedbackMessage = '', 3000);
        this.loadUsers();
      },
      error: (err) => {
        this.creating = false;
        // Errores de validación de Laravel: { errors: { campo: [mensajes] } }
        const errors = err.error?.errors as Record<string, string[]> | undefined;
        if (errors) {
          for (const [field, messages] of Object.entries(errors)) {
            this.createErrors[field] = messages[0];
          }
        } else {
          this.errorMessage = err.error?.message || 'Error al crear el usuario.';
        }
      }
    });
  }

  private emptyNewUser() {
    return {
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      role_id: null as number | null,
      is_active: true,
    };
  }

  toggleActive(user: User, newActive: boolean): void {
    const action = newActive ? 'activar' : 'desactivar';
    if (!confirm(`¿Estás seguro de que deseas ${action} la cuenta de ${user.name}?`)) {
      return;
    }

    this.adminService.updateUser(user.id, { is_active: newActive }).subscribe({
      next: (res) => {
        user.is_active = newActive;
        this.feedbackMessage = `Cuenta de ${user.name} ${newActive ? 'activada' : 'desactivada'} correctamente.`;
        setTimeout(() => this.feedbackMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al modificar estado del usuario.';
      }
    });
  }

  changeUserRole(user: User, newRoleId: number): void {
    this.adminService.updateUser(user.id, { role_id: newRoleId }).subscribe({
      next: (res) => {
        user.role_id = newRoleId;
        user.role = res.user.role;
        this.feedbackMessage = `Rol de ${user.name} actualizado a ${res.user.role.name}.`;
        setTimeout(() => this.feedbackMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al cambiar rol.';
        this.loadUsers(); // Restaurar selector en caso de error
      }
    });
  }
}
