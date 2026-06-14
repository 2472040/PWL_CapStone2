class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Indicates it is a known operational error

    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Permintaan tidak valid (Bad Request)') {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Tidak terautentikasi (Unauthorized)') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Akses ditolak (Forbidden)') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Sumber daya tidak ditemukan (Not Found)') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Terjadi konflik data (Conflict)') {
    super(message, 409);
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Terjadi kesalahan internal server') {
    super(message, 500);
    this.isOperational = false;
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
};
