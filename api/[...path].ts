// Vercel serverless entrypoint.
// Catches every /api/* request and hands it to the Express app defined in
// server.ts. The app keeps its own "/api/..." route definitions, so the
// original request URL is matched unchanged.
import * as serverModule from "../server";

// Robust default resolution across ESM/CJS interop on Vercel's Node runtime.
const app: any = (serverModule as any).default ?? (serverModule as any);

export default function handler(req: any, res: any) {
  try {
    if (typeof app !== "function") {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("App import is not callable: " + typeof app);
      return;
    }
    return app(req, res);
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("INVOKE ERROR: " + (e?.stack || String(e)));
  }
}
