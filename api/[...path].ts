// Vercel serverless entrypoint.
// Catches every /api/* request and hands it to the Express app defined in
// server.ts. The app keeps its own "/api/..." route definitions, so the
// original request URL is matched unchanged.
import app from "../server";

export default app;
