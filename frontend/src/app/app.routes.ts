import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TicketListComponent } from './components/tickets/ticket-list/ticket-list.component';
import { TicketCreateComponent } from './components/tickets/ticket-create/ticket-create.component';
import { TicketDetailComponent } from './components/tickets/ticket-detail/ticket-detail.component';
import { AdminUsersComponent } from './components/admin/admin-users/admin-users.component';
import { AuditLogsComponent } from './components/admin/audit-logs/audit-logs.component';
import { ProfileComponent } from './components/profile/profile.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  // Rutas privadas protegidas por AuthGuard
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'tickets',
    component: TicketListComponent,
    canActivate: [authGuard],
  },
  {
    path: 'tickets/new',
    component: TicketCreateComponent,
    canActivate: [authGuard],
  },
  {
    path: 'tickets/:id',
    component: TicketDetailComponent,
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard],
  },

  // Rutas exclusivas para Administradores protegidas por RoleGuard
  {
    path: 'admin/users',
    component: AdminUsersComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador'] },
  },
  {
    path: 'admin/audit-logs',
    component: AuditLogsComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador'] },
  },

  { path: '**', redirectTo: 'dashboard' },
];
