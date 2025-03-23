import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { FileUploadService } from './file-upload.service';
import { UserRole } from '../users/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let fileUploadService: FileUploadService;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateFcmToken: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockFileUploadService = {
    uploadBase64Avatar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: FileUploadService, useValue: mockFileUploadService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    fileUploadService = module.get<FileUploadService>(FileUploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return the profile of the current user', async () => {
      const user = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.ADMIN,
      };
      
      mockUsersService.findOne.mockResolvedValue(user);
      
      const req = { user: { userId: 1 } };
      const result = await controller.getProfile(req);
      
      expect(result).toEqual(user);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [
        { id: 1, username: 'user1', email: 'user1@example.com', role: UserRole.ADMIN },
        { id: 2, username: 'user2', email: 'user2@example.com', role: UserRole.SUPER_ADMIN },
      ];
      
      mockUsersService.findAll.mockResolvedValue(users);
      
      const result = await controller.findAll();
      
      expect(result).toEqual(users);
      expect(mockUsersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      const user = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.ADMIN,
      };
      
      mockUsersService.findOne.mockResolvedValue(user);
      
      const result = await controller.findOne('1');
      
      expect(result).toEqual(user);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.findOne.mockRejectedValue(new NotFoundException());
      
      await expect(controller.findOne('999')).rejects.toThrow(NotFoundException);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(999);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        role: UserRole.ADMIN,
        name: 'New User'
      };
      
      const createdUser = {
        id: 3,
        username: 'newuser',
        email: 'new@example.com',
        role: UserRole.ADMIN,
        name: 'New User'
      };
      
      mockUsersService.create.mockResolvedValue(createdUser);
      
      const result = await controller.create(createUserDto);
      
      expect(result).toEqual(createdUser);
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto = {
        email: 'updated@example.com',
      };
      
      const updatedUser = {
        id: 1,
        username: 'testuser',
        email: 'updated@example.com',
        role: UserRole.ADMIN,
      };
      
      mockUsersService.update.mockResolvedValue(updatedUser);
      
      const result = await controller.update('1', updateUserDto);
      
      expect(result).toEqual(updatedUser);
      expect(mockUsersService.update).toHaveBeenCalledWith(1, updateUserDto);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      const deleteResult = { id: 1 };
      
      mockUsersService.remove.mockResolvedValue(deleteResult);
      
      const result = await controller.remove('1');
      
      expect(result).toEqual(deleteResult);
      expect(mockUsersService.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('updateProfile', () => {
    it('should update the user profile', async () => {
      const updateProfileDto = {
        fullName: 'Test User',
        bio: 'This is a test bio',
      };
      
      const updatedUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
        bio: 'This is a test bio',
        role: UserRole.ADMIN,
      };
      
      mockUsersService.updateProfile.mockResolvedValue(updatedUser);
      
      const req = { user: { userId: 1 } };
      const result = await controller.updateProfile(req, updateProfileDto as any);
      
      expect(result).toEqual(updatedUser);
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(1, updateProfileDto);
    });
  });

  describe('changePassword', () => {
    it('should change the user password', async () => {
      const changePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
      };
      
      const updatedUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.ADMIN,
      };
      
      mockUsersService.changePassword.mockResolvedValue(updatedUser);
      
      const req = { user: { userId: 1 } };
      const result = await controller.changePassword(req, changePasswordDto);
      
      expect(result).toEqual(updatedUser);
      expect(mockUsersService.changePassword).toHaveBeenCalledWith(1, changePasswordDto);
    });
  });
}); 