import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: 'WebRTC Voice Chat Server is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  getHealthCheck() {
    return {
      status: 'healthy',
      service: 'WebRTC Voice Chat Backend',
      timestamp: new Date().toISOString(),
    };
  }
}
