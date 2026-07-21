/** Erro tipado da Graph API da Meta — separado de `meta-client.ts` (Fase 2) pra
 *  `with-api-handler.ts` poder importar sem depender do client completo. */
export class MetaApiError extends Error {
  status: number;
  code?: number;
  type?: string;

  constructor(message: string, status: number, code?: number, type?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.type = type;
  }
}
