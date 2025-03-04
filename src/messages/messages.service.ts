import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    content: string;
    queryId: number;
    isFromAdmin: boolean;
  }) {
    return this.prisma.message.create({
      data: {
        content: data.content,
        query: {
          connect: { id: data.queryId }
        },
        isFromAdmin: data.isFromAdmin
      },
      include: {
        query: true
      }
    });
  }

  async findByQuery(queryId: number) {
    return this.prisma.message.findMany({
      where: {
        queryId
      },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        query: true
      }
    });
  }
} 