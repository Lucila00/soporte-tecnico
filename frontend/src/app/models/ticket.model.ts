import { User } from './user.model';

export type TicketCategory = 'hardware' | 'software' | 'red' | 'acceso' | 'otro';
export type TicketPriority = 'baja' | 'media' | 'alta' | 'critica';
export type TicketStatus = 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';

export interface TicketComment {
  id: number;
  ticket_id: number;
  user_id: number;
  user: User;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

export interface Ticket {
  id: number;
  ticket_code: string;
  user_id: number;
  assigned_to: number | null;
  creator: User;
  assignee?: User | null;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  comments?: TicketComment[];
  comments_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedTickets {
  data: Ticket[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
