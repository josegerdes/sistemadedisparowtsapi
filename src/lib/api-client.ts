export class ApiClientError extends Error {
  status: number;
  issues?: unknown;
  constructor(message: string, status: number, issues?: unknown) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiClientError(data.message ?? "Erro inesperado", response.status, data.issues);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
