export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Permintaan tidak valid (Bad Request)') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Tidak terautentikasi (Unauthorized)') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Akses ditolak (Forbidden)') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Sumber daya tidak ditemukan (Not Found)') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Terjadi konflik data (Conflict)') {
    super(message, 409);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Terjadi kesalahan internal server') {
    super(message, 500);
    this.isOperational = false;
  }
}
