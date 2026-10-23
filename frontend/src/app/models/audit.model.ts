import { User } from './user.model';

export interface AuditLog {
  id: number;
  user_id?: number | null;
  user?: User | null;
  action: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
