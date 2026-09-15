// Server entry: Fastify for HTTP (health + REST fallbacks) and Socket.IO for
// real-time gameplay. In production put this behind Azure Container Apps with
// the Socket.IO Redis adapter enabled (see infra/ and README).

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { Server as IOServer } from "socket.io";
import { RoomStore } from "./game/store.js";
import { registerHandlers } from "./ws/handlers.js";

const PORT = Number(process.env.PORT ?? 4000);
const ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: ORIGIN });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  const store = new RoomStore();

  app.get("/health", async () => ({ ok: true, rooms: store.all().length, dict: store.dict.counts() }));
  app.get("/api/rooms/:code", async (req, reply) => {
    const code = (req.params as any).code as string;
    const room = store.get(code);
    if (!room) return reply.code(404).send({ error: "NO_ROOM" });
    return room.toSnapshot();
  });

  await app.listen({ port: PORT, host: "0.0.0.0" });

  const io = new IOServer(app.server, { cors: { origin: ORIGIN } });
  // --- To scale to multiple instances, uncomment the Redis adapter: ---
  // import { createAdapter } from "@socket.io/redis-adapter";
  // import { createClient } from "redis";
  // const pub = createClient({ url: process.env.REDIS_URL }); const sub = pub.duplicate();
  // await Promise.all([pub.connect(), sub.connect()]);
  // io.adapter(createAdapter(pub, sub));

  registerHandlers(io, store);
  app.log.info(`WordSprint server ready on :${PORT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
