export type Role = 'cliente' | 'loja' | 'estafeta' | 'admin';
export type UserStatus = 'ativo' | 'pendente' | 'rejeitado';

export interface User {
  _id: string;
  nome: string;
  email: string;
  morada: string;
  telefone: string;
  role: Role;
  status: UserStatus;
  moradas?: string[];
  avatar?: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface RegisterData {
  nome: string;
  email: string;
  password: string;
  morada: string;
  telefone: string;
  role?: 'cliente' | 'estafeta';
}
