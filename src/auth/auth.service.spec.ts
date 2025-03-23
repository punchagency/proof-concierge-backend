import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as argon2 from 'argon2';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByUsername: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user object without password if validation is successful', async () => {
      const user = {
        id: 1,
        username: 'testuser',
        password: 'hashedPassword',
        email: 'test@example.com',
        role: 'user',
      };
      
      mockUsersService.findByUsername.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('testuser', 'password');
      
      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
      });
      expect(usersService.findByUsername).toHaveBeenCalledWith('testuser');
      expect(argon2.verify).toHaveBeenCalledWith('hashedPassword', 'password');
    });

    it('should return null if user is not found', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'password');
      
      expect(result).toBeNull();
      expect(usersService.findByUsername).toHaveBeenCalledWith('nonexistent');
      expect(argon2.verify).not.toHaveBeenCalled();
    });

    it('should return null if password is invalid', async () => {
      const user = {
        id: 1,
        username: 'testuser',
        password: 'hashedPassword',
        email: 'test@example.com',
      };
      
      mockUsersService.findByUsername.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('testuser', 'wrongpassword');
      
      expect(result).toBeNull();
      expect(usersService.findByUsername).toHaveBeenCalledWith('testuser');
      expect(argon2.verify).toHaveBeenCalledWith('hashedPassword', 'wrongpassword');
    });
  });

  describe('login', () => {
    it('should return access token when login is successful', async () => {
      const user = {
        id: 1,
        username: 'testuser',
        role: 'user',
      };
      
      mockJwtService.sign.mockReturnValue('test-token');

      const result = await service.login(user);
      
      expect(result).toEqual({ access_token: 'test-token' });
      expect(jwtService.sign).toHaveBeenCalledWith({
        username: 'testuser',
        sub: 1,
        role: 'user',
      });
    });
  });
}); 