import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  // Enable CORS for all HTTP routes (including /socket.io/)
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      credentials: true,
    },
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(
    `🎤 WebRTC Voice Chat Server running on: http://localhost:${port}`
  );
}

bootstrap();
