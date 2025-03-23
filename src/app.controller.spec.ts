import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { Response } from 'express';

describe('AppController', () => {
  let appController: AppController;
  
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getRoot', () => {
    it('should return HTML content', () => {
      const mockResponse = {
        set: jest.fn(),
      } as unknown as Response;
      
      const result = appController.getRoot(mockResponse);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>Proof Concierge API</title>');
      expect(result).toContain('Proof Concierge API</h1>');
      expect(result).toContain('<p class="status">Running</p>');
    });
  });
}); 