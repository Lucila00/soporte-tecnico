import { Ticket } from './ticket.model';
import { AuditLog } from './audit.model';

export interface DashboardSummary {
  total_tickets: number;
  abiertos: number;
  en_proceso: number;
  resueltos: number;
  cerrados: number;
  mis_asignados?: number;
  por_prioridad?: Record<string, number>;
  por_categoria?: Record<string, number>;
  recent_tickets: Ticket[];
  total_users?: number;
  active_users?: number;
  inactive_users?: number;
  recent_audits?: AuditLog[];
}
