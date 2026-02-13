import type { NextApiResponse } from "next";

export type ApiSuccess<T> = {
  data: T;
  error: null;
  code: "OK";
};

export type ApiError = {
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  code: "ERROR";
};

export function sendOk<T>(
  res: NextApiResponse,
  data: T,
  status = 200
): void {
  res.status(status).json({
    data,
    error: null,
    code: "OK",
  });
}

export function sendError(
  res: NextApiResponse,
  status: number,
  message: string,
  code = "UNKNOWN_ERROR",
  details?: unknown
): void {
  res.status(status).json({
    data: null,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    code: "ERROR",
  });
}
