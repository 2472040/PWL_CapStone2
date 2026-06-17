export {};

declare global {
  namespace Express {
    interface Request {
      user?: any;
      correlationId?: string;
      file?: any;
      files?: any;
    }
  }
}
