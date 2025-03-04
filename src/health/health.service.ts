import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as os from 'os';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async checkDatabase(): Promise<any> {
    try {
      // Use Prisma to check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
      };
    } catch (error) {
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  async checkDiskStorage(path: string = '/', thresholdPercent: number = 0.9): Promise<any> {
    try {
      const stats = fs.statfsSync(path);
      const totalSpace = stats.blocks * stats.bsize;
      const freeSpace = stats.bfree * stats.bsize;
      const usedSpace = totalSpace - freeSpace;
      const usedPercentage = usedSpace / totalSpace;

      const isHealthy = usedPercentage < thresholdPercent;

      return {
        status: isHealthy ? 'up' : 'down',
        message: `Storage usage is at ${Math.round(usedPercentage * 100)}%, ${isHealthy ? 'below' : 'above'} the ${Math.round(thresholdPercent * 100)}% threshold`,
        details: {
          totalSpace: totalSpace,
          freeSpace: freeSpace,
          usedSpace: usedSpace,
          usedPercentage: usedPercentage,
        },
      };
    } catch (error) {
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  async checkMemory(heapThreshold: number = 300 * 1024 * 1024, rssThreshold: number = 300 * 1024 * 1024): Promise<any> {
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsed = memoryUsage.heapUsed;
      const rss = memoryUsage.rss;

      const heapHealthy = heapUsed < heapThreshold;
      const rssHealthy = rss < rssThreshold;

      return {
        heap: {
          status: heapHealthy ? 'up' : 'down',
          message: `Memory heap usage is at ${Math.round(heapUsed / (1024 * 1024))}MB, ${heapHealthy ? 'below' : 'above'} the ${Math.round(heapThreshold / (1024 * 1024))}MB threshold`,
          used: heapUsed,
        },
        rss: {
          status: rssHealthy ? 'up' : 'down',
          message: `Memory RSS usage is at ${Math.round(rss / (1024 * 1024))}MB, ${rssHealthy ? 'below' : 'above'} the ${Math.round(rssThreshold / (1024 * 1024))}MB threshold`,
          used: rss,
        },
      };
    } catch (error) {
      return {
        heap: {
          status: 'down',
          message: error.message,
        },
        rss: {
          status: 'down',
          message: error.message,
        },
      };
    }
  }

  async checkExternalService(url: string, timeout: number = 5000): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { 
          timeout,
          validateStatus: () => true // Accept any status code
        })
      );
      return {
        status: response.status >= 200 && response.status < 300 ? 'up' : 'down',
        statusCode: response.status,
      };
    } catch (error) {
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  async checkFirebase(): Promise<any> {
    try {
      // Use a more reliable Firebase endpoint
      const response = await firstValueFrom(
        this.httpService.get('https://firebase.google.com/', { 
          timeout: 5000,
          validateStatus: () => true // Accept any status code
        })
      );
      return {
        status: response.status >= 200 && response.status < 300 ? 'up' : 'down',
        statusCode: response.status,
      };
    } catch (error) {
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  async checkDonorQueriesHealth() {
    try {
      // Count the number of queries
      const count = await this.prisma.donorQuery.count();
      
      // Check if we can get the most recent query, but handle the case where there are no queries
      let recentQueryDate: Date | null = null;
      
      if (count > 0) {
        const recentQuery = await this.prisma.donorQuery.findFirst({
          orderBy: { createdAt: 'desc' },
        });
        
        if (recentQuery) {
          recentQueryDate = recentQuery.createdAt;
        }
      }

      return {
        status: 'up',
        queryCount: count,
        mostRecentQueryDate: recentQueryDate,
      };
    } catch (error) {
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  getSystemInfo(): any {
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      os: {
        platform: process.platform,
        release: os.release(),
        type: os.type(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpus: os.cpus(),
        loadAvg: os.loadavg(),
      },
      versions: {
        node: process.version,
        dependencies: {
          nestjs: require('@nestjs/core/package.json').version,
          typescript: require('typescript/package.json').version,
        },
      },
    };
  }
} 