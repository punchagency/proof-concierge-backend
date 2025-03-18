import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDonorQueryDto } from './dto/create-donor-query.dto';
import { UpdateDonorQueryDto } from './dto/update-donor-query.dto';
import { FilterDonorQueriesDto } from './dto/filter-donor-queries.dto';
import { QueryStatus, MessageType } from '@prisma/client';
import { MessagesService } from '../communication/services/messages.service';

@Injectable()
export class DonorQueriesService {
  constructor(
    private prisma: PrismaService,
    private messagesService: MessagesService,
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
      },
    });
  }

  async findOne(id: number) {
    const query = await this.prisma.donorQuery.findUnique({ 
      where: { 
        id: id 
      },
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
    try {
      // Extract fields from the DTO
      const { donor, donorId, test, stage, device, content } = createDonorQueryDto;
      
      // Use raw SQL to insert the record with only the fields that exist in the database
      const result = await this.prisma.$queryRaw`
        INSERT INTO "DonorQuery" ("donor", "donorId", "test", "stage", "device", "createdAt", "updatedAt")
        VALUES (${donor}, ${donorId}, ${test}, ${stage}, ${device}, NOW(), NOW())
        RETURNING *
      `;
      
      const query = Array.isArray(result) && result.length > 0 ? result[0] : result;
      
      // If content is provided, create a message for the query
      if (content && query.id) {
        await this.messagesService.create({
          content,
          queryId: query.id,
          isFromAdmin: false,
          messageType: MessageType.QUERY
        });
      }
      
      // Return the first result (should be the only one)
      return query;
    } catch (error) {
      console.error('Error creating donor query:', error);
      throw error;
    }
  }

  async update(id: number, updateDonorQueryDto: UpdateDonorQueryDto) {
    // Ensure the query exists
    await this.findOne(id);
    
    return this.prisma.donorQuery.update({
      where: { 
        id: id 
      },
      data: updateDonorQueryDto,
      include: {
        transferredToUser: true,
        resolvedByUser: true,
      },
    });
  }

  async findByUserEmail(email: string) {
    return this.prisma.donorQuery.findMany({
      where: { donor: email },
      include: {
        transferredToUser: true,
        resolvedByUser: true,
        messages: true,
      },
    });
  }

  async findByDonorId(donorId: string) {
    try {
      // Use a minimal query with no select/include to get raw data
      const queries = await this.prisma.$queryRaw`
        SELECT dq.*, 
               ru.id as resolved_by_user_id, ru.username as resolved_by_username, ru.name as resolved_by_name, 
               ru.email as resolved_by_email, ru.role as resolved_by_role, ru.avatar as resolved_by_avatar,
               tu.id as transferred_to_user_id, tu.username as transferred_to_username, tu.name as transferred_to_name,
               tu.email as transferred_to_email, tu.role as transferred_to_role, tu.avatar as transferred_to_avatar
        FROM "DonorQuery" dq
        LEFT JOIN "User" ru ON dq."resolvedById" = ru.id
        LEFT JOIN "User" tu ON dq."transferredToUserId" = tu.id
        WHERE dq."donorId" = ${donorId}
      `;
      
      // Get messages for each query
      if (Array.isArray(queries) && queries.length > 0) {
        for (const query of queries) {
          const messages = await this.prisma.$queryRaw`
            SELECT * FROM "Message" WHERE "queryId" = ${query.id} ORDER BY "createdAt" ASC
          `;
          query.messages = messages || [];
          
          // Format the resolved by user data
          if (query.resolved_by_user_id) {
            query.resolvedByUser = {
              id: query.resolved_by_user_id,
              username: query.resolved_by_username,
              name: query.resolved_by_name,
              email: query.resolved_by_email,
              role: query.resolved_by_role,
              avatar: query.resolved_by_avatar
            };
          }
          
          // Format the transferred to user data
          if (query.transferred_to_user_id) {
            query.transferredToUser = {
              id: query.transferred_to_user_id,
              username: query.transferred_to_username,
              name: query.transferred_to_name,
              email: query.transferred_to_email,
              role: query.transferred_to_role,
              avatar: query.transferred_to_avatar
            };
          }
          
          // Clean up the raw fields
          delete query.resolved_by_user_id;
          delete query.resolved_by_username;
          delete query.resolved_by_name;
          delete query.resolved_by_email;
          delete query.resolved_by_role;
          delete query.resolved_by_avatar;
          delete query.transferred_to_user_id;
          delete query.transferred_to_username;
          delete query.transferred_to_name;
          delete query.transferred_to_email;
          delete query.transferred_to_role;
          delete query.transferred_to_avatar;
        }
      }
      
      return queries;
    } catch (error) {
      console.error('Error fetching donor queries:', error);
      return []; // Return empty array on error
    }
  }

  async resolveQuery(id: number, resolvedById: number) {
    // Ensure the query exists
    await this.findOne(id);
    
    return this.prisma.donorQuery.update({
      where: { 
        id: id 
      },
      data: {
        status: QueryStatus.RESOLVED,
        resolvedById,
      },
      include: {
        resolvedByUser: true,
      },
    });
  }

  async transferQuery(id: number, transferredToUserId: number, transferredTo: string, transferNote?: string) {
    // Ensure the query exists
    await this.findOne(id);
    
    return this.prisma.donorQuery.update({
      where: { 
        id: id 
      },
      data: {
        status: QueryStatus.TRANSFERRED,
        transferredToUserId,
        transferredTo,
        transferNote,
      },
      include: {
        transferredToUser: true,
      },
    });
  }

  async remove(id: number) {
    // Ensure the query exists
    await this.findOne(id);
    
    await this.prisma.donorQuery.delete({
      where: { 
        id: id 
      },
    });
    
    return { id };
  }

  async sendReminder(id: number, message?: string) {
    const query = await this.findOne(id);
    
    if (query.status !== QueryStatus.TRANSFERRED) {
      throw new Error('Can only send reminders for transferred queries');
    }
    
    if (!query.transferredToUserId && !query.transferredTo) {
      throw new Error('Query has no assigned user to send reminder to');
    }
    
    // Create a system message for the reminder
    if (query.transferredToUserId) {
      await this.prisma.message.create({
        data: {
          queryId: query.id,
          messageType: MessageType.SYSTEM,
          content: message || `Reminder for query ${query.id} - ${query.donor}`,
          senderId: query.transferredToUserId,
        },
      });
    }
    
    // Update the query's updatedAt timestamp
    return this.prisma.donorQuery.update({
      where: { id: query.id },
      data: {}, // Empty update to trigger updatedAt
      include: {
        transferredToUser: true,
      },
    });
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
      const query = await this.findOne(id);

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
        where: { id: id },
        data: {
          status: 'IN_PROGRESS',
          assignedToId: userId,
          updatedAt: new Date(),
        },
      });

      // Create a system message for the query acceptance
      await this.prisma.message.create({
        data: {
          queryId: query.id,
          messageType: MessageType.SYSTEM,
          content: `Query #${query.id} has been accepted by ${user.name}`,
          senderId: userId,
          isFromAdmin: true,
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
        // Include assigned admin information
        assignedToUser: true,
      },
    });
  }

  async findManyByStatusesWithFilters(statuses: QueryStatus[], filterDto: FilterDonorQueriesDto) {
    const { test, stage, queryMode, device, date } = filterDto;
    
    // Build the query conditions
    const where: any = {
      status: {
        in: statuses,
      },
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
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        transferredToUser: true,
        resolvedByUser: true,
        assignedToUser: true,
      },
    });
  }
} 