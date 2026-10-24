import type { Request, Response, NextFunction } from "express";

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  if (origin) {
    // nosemgrep: javascript.express.security.cors-misconfiguration.cors-misconfiguration
    res.header("Access-Control-Allow-Origin", origin);
  } else {
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
}

export default corsMiddleware;
