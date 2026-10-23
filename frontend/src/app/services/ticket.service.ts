import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaginatedTickets, Ticket, TicketComment } from '../models/ticket.model';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tickets`;

  getTickets(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    page?: number;
  }): Observable<PaginatedTickets> {
    let params = new HttpParams();

    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.priority) params = params.set('priority', filters.priority);
      if (filters.category) params = params.set('category', filters.category);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.page) params = params.set('page', filters.page.toString());
    }

    return this.http.get<PaginatedTickets>(this.apiUrl, { params });
  }

  getTicket(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/${id}`);
  }

  createTicket(ticketData: {
    title: string;
    description: string;
    category: string;
    priority: string;
  }): Observable<{ message: string; ticket: Ticket }> {
    return this.http.post<{ message: string; ticket: Ticket }>(this.apiUrl, ticketData);
  }

  updateTicket(id: number, ticketData: any): Observable<{ message: string; ticket: Ticket }> {
    return this.http.put<{ message: string; ticket: Ticket }>(`${this.apiUrl}/${id}`, ticketData);
  }

  deleteTicket(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  addComment(ticketId: number, comment: string, isInternal: boolean = false): Observable<{ message: string; comment: TicketComment }> {
    return this.http.post<{ message: string; comment: TicketComment }>(
      `${this.apiUrl}/${ticketId}/comments`,
      { comment, is_internal: isInternal }
    );
  }
}
