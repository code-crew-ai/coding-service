import { RedisServer } from "@code-crew-ai/server-redis";
import { AppModule } from "./app.module";

async function bootstrap() {
  const server = new RedisServer();
  await server.start(AppModule);
}

bootstrap();
