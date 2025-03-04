import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller('health/advanced')
export class AdvancedHealthController {
  constructor(
    private healthService: HealthService,
    private configService: ConfigService,
  ) {}

  private getOverallStatus(statuses: string[]): string {
    if (statuses.some(status => status === 'down')) {
      return 'error';
    }
    if (statuses.some(status => status === 'warning')) {
      return 'warning';
    }
    return 'ok';
  }

  @Get()
  @ApiOperation({ summary: 'Get advanced health check information' })
  async check() {
    const [
      database,
      storage,
      memory,
      firebase,
      frontend,
      donorQueries,
    ] = await Promise.all([
      this.healthService.checkDatabase(),
      this.healthService.checkDiskStorage(),
      this.healthService.checkMemory(),
      this.healthService.checkFirebase(),
      this.healthService.checkExternalService('http://localhost:3000', 2000), // Adjust timeout and expect local frontend
      this.healthService.checkDonorQueriesHealth(),
    ]);

    // Create a modified frontend result that uses warning instead of down
    const frontendResult = {
      ...frontend,
      status: frontend.status === 'down' ? 'warning' : frontend.status
    };

    return {
      status: this.getOverallStatus([
        database.status,
        storage.status,
        memory.heap.status,
        memory.rss.status,
        firebase.status,
        frontendResult.status, // Use the modified status
        donorQueries.status,
      ]),
      info: {
        database: { status: database.status },
        storage: { status: storage.status },
        memory_heap: { status: memory.heap.status },
        memory_rss: { status: memory.rss.status },
        firebase: { status: firebase.status },
        frontend: { status: frontendResult.status }, // Use the modified status
        donor_queries: { status: donorQueries.status },
      },
      error: {},
      details: {
        database,
        storage,
        memory_heap: memory.heap,
        memory_rss: memory.rss,
        firebase,
        frontend: frontendResult, // Use the modified result
        donor_queries: donorQueries,
      },
    };
  }

  @Get('detailed')
  detailedCheck() {
    return this.healthService.getSystemInfo();
  }
} 