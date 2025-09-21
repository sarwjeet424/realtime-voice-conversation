import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

let app: any;

async function createApp() {
  if (!app) {
    app = await NestFactory.create(AppModule, {
      cors: {
        origin: true,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });
  }
  return app;
}

// Export for Vercel
export default async (req: any, res: any) => {
  const nestApp = await createApp();
  return nestApp.getHttpAdapter().getInstance()(req, res);
};
