import { serve } from "@hono/node-server";
import { app } from "./app";

const port = Number(process.env.PORT ?? 8787);
console.log(`Hono API server listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
