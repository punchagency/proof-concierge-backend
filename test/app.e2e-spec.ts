import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppController } from '../src/app.controller';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';
import { ConfigService } from '@nestjs/config';

describe('Core Endpoints (e2e)', () => {
  let app: INestApplication;

  const mockHealthService = {
    checkDatabase: jest.fn().mockResolvedValue({ status: 'up', responseTime: 10 }),
    checkDiskStorage: jest.fn().mockResolvedValue({ 
      status: 'up', 
      details: { free: '10GB', total: '100GB', used: '90GB', usedPercentage: 90 }
    }),
    checkMemory: jest.fn().mockResolvedValue({
      heap: { status: 'up', used: 100, total: 1000, usedPercentage: 10 },
      rss: { status: 'up', used: 200, total: 2000, usedPercentage: 10 }
    }),
    getProcessInfo: jest.fn(),
    checkAdvanced: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'PORT') return 3000;
      if (key === 'NODE_ENV') return 'test';
      return null;
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController, HealthController],
      providers: [
        { provide: HealthService, useValue: mockHealthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Root endpoint', () => {
    it('/ (GET)', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Content-Type', /html/)
        .expect((res) => {
          expect(res.text).toContain('Proof Concierge API');
          expect(res.text).toContain('Running');
        });
    });
  });

  describe('Health endpoints', () => {
    it('/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect('Content-Type', /html/)
        .expect((res) => {
          expect(res.text).toContain('System Health Status');
          expect(res.text).toContain('status-ok');
        });
    });

    it('/health/ping (GET)', () => {
      return request(app.getHttpServer())
        .get('/health/ping')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });
});
