import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  
  // Mock PrismaClient behavior
  const mockConnect = jest.fn();
  const mockDisconnect = jest.fn();
  
  beforeEach(async () => {
    // Mock the $connect and $disconnect methods
    jest.spyOn(PrismaService.prototype, '$connect').mockImplementation(mockConnect);
    jest.spyOn(PrismaService.prototype, '$disconnect').mockImplementation(mockDisconnect);
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to the database when module initializes', async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      
      await service.onModuleInit();
      
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
    
    it('should retry connection if it fails initially', async () => {
      // First call fails, second succeeds
      mockConnect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(undefined);
      
      // Mock setTimeout to avoid waiting in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });
      
      await service.onModuleInit();
      
      expect(mockConnect).toHaveBeenCalledTimes(2);
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from the database when module is destroyed', async () => {
      mockDisconnect.mockResolvedValueOnce(undefined);
      
      await service.onModuleDestroy();
      
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanUserData', () => {
    it('should remove password from user data', () => {
      const user = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
      };
      
      const result = service.cleanUserData(user);
      
      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      });
      expect(result.password).toBeUndefined();
    });
    
    it('should return user data as is if no password field exists', () => {
      const user = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };
      
      const result = service.cleanUserData(user);
      
      expect(result).toEqual(user);
    });
    
    it('should handle null user data', () => {
      const result = service.cleanUserData(null);
      
      expect(result).toBeNull();
    });
  });
}); 