export class AppFirestoreError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation: string,
    public path?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "AppFirestoreError";
  }
}

export function handleFirestoreError(error: unknown, operation: string, path?: string): AppFirestoreError {
  const fbError = error as { code?: string; message?: string };
  const code = fbError.code || "unknown";
  const message = fbError.message || "An unknown error occurred";

  let friendlyMessage = message;

  switch (code) {
    case "permission-denied":
      friendlyMessage = `Permission denied for ${operation} at ${path || "document"}. Please make sure you are signed in and have access.`;
      break;
    case "not-found":
      friendlyMessage = `Requested resource was not found for ${operation} at ${path || "document"}.`;
      break;
    case "already-exists":
      friendlyMessage = `Document already exists for ${operation}.`;
      break;
    case "unauthenticated":
      friendlyMessage = "You must be signed in to perform this operation.";
      break;
    case "unavailable":
      friendlyMessage = "Firestore service is temporarily unavailable. Check your internet connection.";
      break;
    case "deadline-exceeded":
      friendlyMessage = "Operation timed out. Please try again.";
      break;
    default:
      friendlyMessage = `Failed to ${operation}: ${message}`;
  }

  const appError = new AppFirestoreError(friendlyMessage, code, operation, path, error);
  console.error(`[Firestore Error - ${operation}]`, {
    code,
    path,
    message,
    original: error
  });

  return appError;
}
