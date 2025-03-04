import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    private healthService: HealthService,
  ) {}

  @Get()
  async check() {
    const database = await this.healthService.checkDatabase();
    const storage = await this.healthService.checkDiskStorage();
    const memory = await this.healthService.checkMemory();

    const status = 
      database.status === 'up' && 
      storage.status === 'up' && 
      memory.heap.status === 'up' && 
      memory.rss.status === 'up' ? 'ok' : 'error';

    return {
      status,
      info: {
        database: {
          status: database.status
        },
        storage: {
          status: storage.status
        },
        memory_heap: {
          status: memory.heap.status
        },
        memory_rss: {
          status: memory.rss.status
        }
      },
      error: {},
      details: {
        database,
        storage,
        memory_heap: memory.heap,
        memory_rss: memory.rss
      }
    };
  }

  @Get('ping')
  ping() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
} 