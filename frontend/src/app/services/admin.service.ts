import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Role, User } from '../models/user.model';
import { PaginatedAuditLogs } from '../models/audit.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin`;

  getUsers(filters?: { role_id?: number; search?: string; page?: number }): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      if (filters.role_id) params = params.set('role_id', filters.role_id.toString());
      if (filters.search) params = params.set('search', filters.search);
      if (filters.page) params = params.set('page', filters.page.toString());
    }
    return this.http.get<any>(`${this.apiUrl}/users`, { params });
  }

  updateUser(id: number, data: { name?: string; role_id?: number; is_active?: boolean }): Observable<{ message: string; user: User }> {
    return this.http.put<{ message: string; user: User }>(`${this.apiUrl}/users/${id}`, data);
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/roles`);
  }

  getOperators(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/operators`);
  }

  getAuditLogs(filters?: { action?: string; user_id?: number; page?: number }): Observable<PaginatedAuditLogs> {
    let params = new HttpParams();
    if (filters) {
      if (filters.action) params = params.set('action', filters.action);
      if (filters.user_id) params = params.set('user_id', filters.user_id.toString());
      if (filters.page) params = params.set('page', filters.page.toString());
    }
    return this.http.get<PaginatedAuditLogs>(`${this.apiUrl}/audit-logs`, { params });
  }
}
