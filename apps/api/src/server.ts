import { serve } from "@hono/node-server";
import { buildDefaultInMemoryApp } from "./app";

const app = buildDefaultInMemoryApp();
const port = Number(process.env.PORT ?? 8787);
console.log(`Hono API server listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
