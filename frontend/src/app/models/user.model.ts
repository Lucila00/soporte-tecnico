export interface Role {
  id: number;
  name: 'administrador' | 'operador' | 'usuario';
  description?: string;
  created_at?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  role: Role;
  is_active: boolean;
  created_at?: string;
  created_tickets_count?: number;
  assigned_tickets_count?: number;
}

export interface AuthResponse {
  message: string;
  user: User;
  token?: string;
}
