import { NextResponse } from "next/server";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonError(message: string, status = 500, details?: string) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );
}

export function routeError(error: unknown) {
  if (error instanceof HttpError) {
    return jsonError(error.message, error.status);
  }
  if (error instanceof Error) {
    return jsonError("Внутренняя ошибка сервера", 500, error.message);
  }
  return jsonError("Внутренняя ошибка сервера", 500);
}
