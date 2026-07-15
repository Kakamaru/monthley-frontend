export type UserRole = 'SUPERADMIN' | 'SP_ADMIN' | 'CLERK' | 'VIEWER' | 'CUSTOMER';

export interface SpAccess {
  spCode: string;
  spName: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  userId: number;
  email: string;
  fullName: string;
  superadmin: boolean;
  spAccess: SpAccess[];
  hasLinkedAccounts: boolean;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  mobile?: string;
  password: string;
}
