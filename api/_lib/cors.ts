import type { VercelRequest, VercelResponse } from "@vercel/node";

// CORS headers for cross-origin requests from Firebase Hosting
export function setCorsHeaders(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
}

export function handleCors(
  req: VercelRequest,
  res: VercelResponse
): boolean {
  setCorsHeaders(res);

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }

  return false;
}
