import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDonorQueryDto } from './dto/create-donor-query.dto';
import { UpdateDonorQueryDto } from './dto/update-donor-query.dto';
import { FilterDonorQueriesDto } from './dto/filter-donor-queries.dto';
import { QueryStatus } from '@prisma/client';

@Injectable()
export class DonorQueriesService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async findAll() {
    return this.prisma.donorQuery.findMany({
      include: {
        transferredToUser: true,
        resolvedByUser: true,
      },
    });
  }

  async findAllByStatus(status: QueryStatus) {
    return this.prisma.donorQuery.findMany({
      where: {
        status,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        callRequests: {
          include: {
            admin: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const query = await this.prisma.donorQuery.findUnique({ 
      where: { id },
      include: {
        transferredToUser: true,
        resolvedByUser: true,
        messages: true,
      },
    });
    
    if (!query) {
      throw new NotFoundException(`Donor query with ID ${id} not found`);
    }
    
    return query;
  }

  async create(createDonorQueryDto: CreateDonorQueryDto) {
    return this.prisma.donorQuery.create({
      data: createDonorQueryDto,
    });
  }

  async update(id: number, updateDonorQueryDto: UpdateDonorQueryDto) {
    // Ensure the query exists
    await this.findOne(id);
    
    return this.prisma.donorQuery.update({
      where: { id },
      data: updateDonorQueryDto,
      include: {
        transferredToUser: true,
        resolvedByUser: true,
      },
    });
  }

  async resolveQuery(id: number, resolvedById: number) {
    // Ensure the query exists
    await this.findOne(id);
    
    return this.prisma.donorQuery.update({
      where: { id },
      data: {
        status: QueryStatus.RESOLVED,
        resolvedById,
      },
      include: {
        resolvedByUser: true,
      },
    });
  }

  async transferQuery(id: number, transferredToUserId: number, transferNote?: string) {
    // Ensure the query exists
    await this.findOne(id);
    
    // Get the user to maintain backward compatibility with transferredTo field
    const user = await this.prisma.user.findUnique({
      where: { id: transferredToUserId },
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${transferredToUserId} not found`);
    }
    
    return this.prisma.donorQuery.update({
      where: { id },
      data: {
        status: QueryStatus.TRANSFERRED,
        transferredToUserId,
        transferredTo: user.name, // For backward compatibility
        transferNote,
      },
      include: {
        transferredToUser: true,
      },
    });
  }

  async sendReminder(id: number, message?: string) {
    const query = await this.findOne(id);
    
    if (query.status !== QueryStatus.TRANSFERRED) {
      throw new Error('Can only send reminders for transferred queries');
    }
    
    if (!query.transferredToUserId && !query.transferredTo) {
      throw new Error('Query has no assigned user to send reminder to');
    }
    
    // In a real application, you would send an email or notification here
    // For now, we'll just log the reminder
    console.log(`Sending reminder for query ${id} to ${query.transferredToUser?.name || query.transferredTo}`);
    if (message) {
      console.log(`Reminder message: ${message}`);
    }
    
    // Create a notification for the user
    if (query.transferredToUserId) {
      await this.prisma.notification.create({
        data: {
          userId: query.transferredToUserId,
          message: message || `Reminder for query ${query.id} - ${query.donor}`,
          queryId: query.id,
        },
      });
    }
    
    // Update the query's updatedAt timestamp
    return this.prisma.donorQuery.update({
      where: { id },
      data: {}, // Empty update to trigger updatedAt
      include: {
        transferredToUser: true,
      },
    });
  }

  async remove(id: number) {
    // Ensure the query exists
    await this.findOne(id);
    
    await this.prisma.donorQuery.delete({
      where: { id },
    });
    
    return { id };
  }

  async findWithFilters(filterDto: FilterDonorQueriesDto) {
    const { test, stage, queryMode, device, date, status } = filterDto;
    
    // Build the query conditions
    const where: any = {};
    
    if (test) {
      where.test = test;
    }
    
    if (stage) {
      where.stage = stage;
    }
    
    if (queryMode) {
      where.queryMode = queryMode;
    }
    
    if (device) {
      where.device = device;
    }
    
    if (date) {
      // Create start and end date for the given date (full day)
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }
    
    if (status) {
      where.status = status;
    }
    
    return this.prisma.donorQuery.findMany({
      where,
      include: {
        transferredToUser: true,
        resolvedByUser: true,
      },
    });
  }

  async findAllByStatusWithFilters(status: QueryStatus, filterDto: FilterDonorQueriesDto) {
    const { test, stage, queryMode, device, date } = filterDto;
    
    // Build the query conditions
    const where: any = {
      status,
    };
    
    if (test) {
      where.test = test;
    }
    
    if (stage) {
      where.stage = stage;
    }
    
    if (queryMode) {
      where.queryMode = queryMode;
    }
    
    if (device) {
      where.device = device;
    }
    
    if (date) {
      // Create start and end date for the given date (full day)
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }
    
    return this.prisma.donorQuery.findMany({
      where,
      include: {
        transferredToUser: true,
        resolvedByUser: true,
      },
    });
  }

  async acceptQuery(id: number, userId: number) {
    try {
      // Check if the query exists
      const query = await this.prisma.donorQuery.findUnique({
        where: { id },
      });

      if (!query) {
        throw new Error('Query not found');
      }

      // Check if the query is already resolved or transferred
      if (query.status === 'RESOLVED' || query.status === 'TRANSFERRED') {
        throw new Error('Cannot accept a resolved or transferred query');
      }

      // Get the user who is accepting the query
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Update the query status to IN_PROGRESS and assign it to the user
      const updatedQuery = await this.prisma.donorQuery.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          assignedToId: userId,
          updatedAt: new Date(),
        },
      });

      // Create a notification for the query
      await this.prisma.notification.create({
        data: {
          userId,
          message: `You have accepted query #${id} from ${query.donor}`,
          queryId: id,
        },
      });

      // Return the updated query
      return updatedQuery;
    } catch (error) {
      console.error('Error accepting query:', error);
      throw error;
    }
  }

  async findManyByStatuses(statuses: QueryStatus[]) {
    return this.prisma.donorQuery.findMany({
      where: {
        status: {
          in: statuses,
        },
        // Only return queries that have been accepted (have an assignedToId)
        assignedToId: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        callRequests: {
          include: {
            admin: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        // Include assigned admin information
        assignedToUser: true,
      },
    });
  }
} 