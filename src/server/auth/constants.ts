/**
 * Constantes de auth sem dependências pesadas (ex: jsonwebtoken) — importável
 * a partir de `middleware.ts`, que roda no Edge Runtime e não pode carregar
 * módulos Node.js como o `jsonwebtoken`.
 */
export const AUTH_COOKIE_NAME = "dwa_session";
