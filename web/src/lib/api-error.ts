import { API_ERROR_CODE, type ApiErrorBody, type ApiErrorCode } from "../types/api.ts";

/** Every failed API call rejects with this. `code` follows README §14 "Error format". */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | (string & {});

  constructor(status: number, code: ApiErrorCode | (string & {}), message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const error = (value as { error: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

export function toApiError(status: number, body: unknown): ApiError {
  if (isApiErrorBody(body)) return new ApiError(status, body.error.code, body.error.message);
  if (status === 401) {
    return new ApiError(status, API_ERROR_CODE.UNAUTHENTICATED, "Please log in to continue.");
  }
  return new ApiError(status, API_ERROR_CODE.UNKNOWN_ERROR, `Request failed (${status}).`);
}
