/** Provider-agnostic error the admin AI routes turn into a JSON response. */
export class CatalogAiError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "CatalogAiError";
  }
}

/** Anything else becomes a generic error so internals never leak to the client. */
export function asCatalogAiError(error: unknown): CatalogAiError {
  if (error instanceof CatalogAiError) return error;
  const missingProvider = error instanceof Error && error.message.startsWith("No AI provider");
  return new CatalogAiError(
    missingProvider ? (error as Error).message : "Unexpected AI error. Try again.",
    missingProvider ? 503 : 500,
  );
}
