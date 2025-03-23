import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import * as argon2 from 'argon2';

jest.mock('argon2');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    cleanUserData: jest.fn(user => {
      const { password, ...cleanedUser } = user;
      return cleanedUser;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users with cleaned data', async () => {
      const users = [
        { id: 1, username: 'user1', password: 'hashed1', email: 'user1@example.com' },
        { id: 2, username: 'user2', password: 'hashed2', email: 'user2@example.com' },
      ];
      
      const cleanedUsers = [
        { id: 1, username: 'user1', email: 'user1@example.com' },
        { id: 2, username: 'user2', email: 'user2@example.com' },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();
      
      expect(result).toEqual(cleanedUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
      expect(mockPrismaService.cleanUserData).toHaveBeenCalledTimes(2);
    });
  });

  describe('findOne', () => {
    it('should return a user if found', async () => {
      const user = { id: 1, username: 'testuser', password: 'hashed', email: 'test@example.com' };
      const cleanedUser = { id: 1, username: 'testuser', email: 'test@example.com' };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne(1);
      
      expect(result).toEqual(cleanedUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('findByUsername', () => {
    it('should return a user if found by username', async () => {
      const user = { id: 1, username: 'testuser', password: 'hashed', email: 'test@example.com' };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findByUsername('testuser');
      
      expect(result).toEqual(user);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      const userData = { username: 'newuser', password: 'password123', email: 'new@example.com' };
      const hashedPassword = 'hashed_password';
      const createdUser = { id: 1, username: 'newuser', password: hashedPassword, email: 'new@example.com' };
      const cleanedUser = { id: 1, username: 'newuser', email: 'new@example.com' };

      (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(userData);
      
      expect(result).toEqual(cleanedUser);
      expect(argon2.hash).toHaveBeenCalledWith('password123');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: 'newuser',
          password: hashedPassword,
          email: 'new@example.com',
        },
      });
    });
  });

  describe('update', () => {
    it('should update user without changing password if not provided', async () => {
      const userData = { username: 'updateduser', email: 'updated@example.com' };
      const updatedUser = { id: 1, username: 'updateduser', password: 'existing_hash', email: 'updated@example.com' };
      const cleanedUser = { id: 1, username: 'updateduser', email: 'updated@example.com' };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(1, userData);
      
      expect(result).toEqual(cleanedUser);
      expect(argon2.hash).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: userData,
      });
    });

    it('should update user and hash password if provided', async () => {
      const userData = { username: 'updateduser', password: 'newpassword', email: 'updated@example.com' };
      const hashedPassword = 'new_hashed_password';
      const updatedUser = { id: 1, username: 'updateduser', password: hashedPassword, email: 'updated@example.com' };
      const cleanedUser = { id: 1, username: 'updateduser', email: 'updated@example.com' };

      (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(1, userData);
      
      expect(result).toEqual(cleanedUser);
      expect(argon2.hash).toHaveBeenCalledWith('newpassword');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...userData, password: hashedPassword },
      });
    });
  });

  describe('remove', () => {
    it('should delete a user and return the id', async () => {
      mockPrismaService.user.delete.mockResolvedValue({ id: 1 });

      const result = await service.remove(1);
      
      expect(result).toEqual({ id: 1 });
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('changePassword', () => {
    it('should change password when all conditions are met', async () => {
      const user = { id: 1, username: 'testuser', password: 'current_hash', email: 'test@example.com' };
      const cleanedUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      const changePasswordDto = {
        currentPassword: 'currentpassword',
        newPassword: 'newpassword',
      };
      const newHashedPassword = 'new_hashed_password';

      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (argon2.hash as jest.Mock).mockResolvedValue(newHashedPassword);
      mockPrismaService.user.update.mockResolvedValue({ ...user, password: newHashedPassword });

      const result = await service.changePassword(1, changePasswordDto);
      
      expect(result).toEqual(cleanedUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(argon2.verify).toHaveBeenCalledWith('current_hash', 'currentpassword');
      expect(argon2.hash).toHaveBeenCalledWith('newpassword');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: newHashedPassword },
      });
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      const user = { id: 1, username: 'testuser', password: 'current_hash', email: 'test@example.com' };
      const changePasswordDto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(1, changePasswordDto)).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(argon2.verify).toHaveBeenCalledWith('current_hash', 'wrongpassword');
      expect(argon2.hash).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if new password is same as current', async () => {
      const user = { id: 1, username: 'testuser', password: 'current_hash', email: 'test@example.com' };
      const changePasswordDto = {
        currentPassword: 'samepassword',
        newPassword: 'samepassword',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      await expect(service.changePassword(1, changePasswordDto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(argon2.verify).toHaveBeenCalledWith('current_hash', 'samepassword');
      expect(argon2.hash).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });
}); 