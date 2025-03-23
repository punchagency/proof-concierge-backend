import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { Response } from 'express';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  const mockHealthService = {
    checkDatabase: jest.fn(),
    checkDiskStorage: jest.fn(),
    checkMemory: jest.fn(),
    getProcessInfo: jest.fn(),
    checkAdvanced: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthService, useValue: mockHealthService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health status with HTML format when all systems are up', async () => {
      const mockResponse = {
        set: jest.fn(),
        json: jest.fn(),
        header: jest.fn(),
        req: {
          headers: {
            accept: 'text/html'
          }
        }
      } as unknown as Response;
      
      mockHealthService.checkDatabase.mockResolvedValue({ status: 'up', responseTime: 10 });
      mockHealthService.checkDiskStorage.mockResolvedValue({ 
        status: 'up', 
        details: { free: '10GB', total: '100GB', used: '90GB', usedPercentage: 90 }
      });
      mockHealthService.checkMemory.mockResolvedValue({
        heap: { status: 'up', used: 100, total: 1000, usedPercentage: 10 },
        rss: { status: 'up', used: 200, total: 2000, usedPercentage: 10 }
      });
      
      const result = await controller.check(mockResponse);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('System Health Status');
      expect(result).toContain('status-ok');
      expect(healthService.checkDatabase).toHaveBeenCalled();
      expect(healthService.checkDiskStorage).toHaveBeenCalled();
      expect(healthService.checkMemory).toHaveBeenCalled();
    });
    
    it('should return error status when database is down', async () => {
      const mockResponse = {
        set: jest.fn(),
        json: jest.fn(),
        header: jest.fn(),
        req: {
          headers: {
            accept: 'text/html'
          }
        }
      } as unknown as Response;
      
      mockHealthService.checkDatabase.mockResolvedValue({ status: 'down', error: 'Database connection failed' });
      mockHealthService.checkDiskStorage.mockResolvedValue({ 
        status: 'up', 
        details: { free: '10GB', total: '100GB', used: '90GB', usedPercentage: 90 }
      });
      mockHealthService.checkMemory.mockResolvedValue({
        heap: { status: 'up', used: 100, total: 1000, usedPercentage: 10 },
        rss: { status: 'up', used: 200, total: 2000, usedPercentage: 10 }
      });
      
      const result = await controller.check(mockResponse);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('System Health Status');
      expect(result).toContain('status-error');
      expect(healthService.checkDatabase).toHaveBeenCalled();
      expect(healthService.checkDiskStorage).toHaveBeenCalled();
      expect(healthService.checkMemory).toHaveBeenCalled();
    });
  });

  describe('ping', () => {
    it('should return status object', () => {
      const result = controller.ping();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
    });
  });
}); 