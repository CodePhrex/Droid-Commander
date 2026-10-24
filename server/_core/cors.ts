import type { Request, Response, NextFunction } from "express";

export function trustedExpoWebOrigins(): string[] {
  const origins: string[] = [];
  const proxyUrl = process.env.EXPO_PACKAGER_PROXY_URL;
  if (proxyUrl) {
    try {
      const url = new URL(proxyUrl);
      origins.push(url.origin);
    } catch {
      // Ignore malformed proxy URLs
    }
  }
  return origins;
}

export function createCorsMiddleware(
  allowedOrigins?: (string | RegExp)[] | string,
  isLocalApi?: (req: Request) => boolean
) {
  return function corsMiddleware(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers.origin;
    let isAllowed = false;

    if (origin) {
      if (Array.isArray(allowedOrigins)) {
        isAllowed = allowedOrigins.some((allowed) => {
          if (allowed instanceof RegExp) return allowed.test(origin);
          return allowed === origin;
        });
      } else if (typeof allowedOrigins === "string") {
        isAllowed = allowedOrigins === "*" || allowedOrigins === origin;
      }

      if (!isAllowed) {
        const expoOrigins = trustedExpoWebOrigins();
        isAllowed = expoOrigins.includes(origin);
      }

      if (!isAllowed && isLocalApi && isLocalApi(req)) {
        isAllowed = true;
      }
    }

    if (origin && isAllowed) {
      // nosemgrep: javascript.express.security.cors-misconfiguration.cors-misconfiguration
      res.header("Access-Control-Allow-Origin", origin);
    } else if (!origin) {
      // nosemgrep: javascript.express.security.cors-misconfiguration.cors-misconfiguration
      res.header("Access-Control-Allow-Origin", "*");
    }

    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept, Authorization, X-Requested-With"
    );
    res.header("Vary", "Origin");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  };
}

export const corsMiddleware = createCorsMiddleware();
export default corsMiddleware;
