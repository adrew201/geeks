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

/** A code for bodies that carry none, from the HTTP status. */
function codeForStatus(status: number): ApiErrorCode {
  if (status === 400) return API_ERROR_CODE.VALIDATION_ERROR;
  if (status === 401) return API_ERROR_CODE.UNAUTHENTICATED;
  if (status === 404) return API_ERROR_CODE.NOT_FOUND;
  return API_ERROR_CODE.UNKNOWN_ERROR;
}

export function toApiError(status: number, body: unknown): ApiError {
  if (isApiErrorBody(body)) return new ApiError(status, body.error.code, body.error.message);
  // Some routes (clips, votes) send `{ error: "message" }` instead of the standard shape.
  if (typeof body === "object" && body !== null && "error" in body) {
    const message = (body as { error: unknown }).error;
    if (typeof message === "string" && message.trim() !== "") {
      return new ApiError(status, codeForStatus(status), message);
    }
  }
  if (status === 401) {
    return new ApiError(status, API_ERROR_CODE.UNAUTHENTICATED, "Please log in to continue.");
  }
  return new ApiError(status, API_ERROR_CODE.UNKNOWN_ERROR, `Request failed (${status}).`);
}
