import { Request, Response, NextFunction } from 'express';

export interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: 'sysadmin' | 'kalab' | 'kaprodi' | 'admin' | 'staflab';
  status: 'active' | 'paused';
  initials?: string;
  last_login?: Date;
  token_version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserAttributes & Record<string, any>;
      correlationId?: string;
      rawBody?: string;
    }
  }
}
