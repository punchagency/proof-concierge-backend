import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany();
    return users.map(user => this.prisma.cleanUserData(user));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return this.prisma.cleanUserData(user);
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async create(userData: any) {
    const hashedPassword = await argon2.hash(userData.password);
    
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
    });
    
    return this.prisma.cleanUserData(user);
  }

  async update(id: number, userData: any) {
    if (userData.password) {
      userData.password = await argon2.hash(userData.password);
    }
    
    const user = await this.prisma.user.update({
      where: { id },
      data: userData,
    });
    
    return this.prisma.cleanUserData(user);
  }

  async remove(id: number) {
    await this.prisma.user.delete({
      where: { id },
    });
    
    return { id };
  }
}
