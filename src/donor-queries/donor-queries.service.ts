import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDonorQueryDto } from './dto/create-donor-query.dto';
import { UpdateDonorQueryDto } from './dto/update-donor-query.dto';
import { FilterDonorQueriesDto } from './dto/filter-donor-queries.dto';
import { QueryStatus, MessageType, CallStatus } from '@prisma/client';
import { MessagesService } from '../communication/services/messages.service';
import { CallsService } from '../communication/services/calls.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { UserRole } from '@prisma/client';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class DonorQueriesService {
  constructor(
    private prisma: PrismaService,
    private messagesService: MessagesService,
    private callsService: CallsService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
    private emailService: EmailService,
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
        assignedToUser: true,
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
      
      // Check if the donor already has an unresolved query
      const existingUnresolvedQueries = await this.prisma.donorQuery.findMany({
        where: {
          donorId: donorId,
          status: {
            notIn: [QueryStatus.RESOLVED, QueryStatus.TRANSFERRED]
          }
        },
        take: 1
      });
      
      if (existingUnresolvedQueries.length > 0) {
        throw new Error('You already have an active query that has not been resolved. Please wait for your current query to be resolved before creating a new one.');
      }
      
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
      
      // Send push notification to all admins about the new query
      await this.notificationsService.notifyAllAdmins(
        'New Donor Query',
        `New query from ${donor} for ${test}`,
        {
          type: 'new_query',
          queryId: query.id?.toString() || '',
          donorId: donorId,
          test: test,
          timestamp: new Date().toISOString(),
        }
      );
      
      // Send email notification to all admins about the new query
      await this.emailService.sendNewQueryNotification(
        query.id,
        donor,
        test,
        stage,
        device,
        content,
        donorId
      );
      
      // Send real-time WebSocket notification to all admins
      this.notificationsGateway.notifyNewQuery(
        query.id, 
        `${donor} - ${test} (${stage})`
      );
      
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
      // Use Prisma's standard API instead of raw queries to avoid plan caching issues
      const queries = await this.prisma.donorQuery.findMany({
        where: { 
          donorId 
        },
        include: {
          resolvedByUser: {
            select: {
              id: true,
              username: true,
              name: true,
              email: true,
              role: true,
              avatar: true
            }
          },
          transferredToUser: {
            select: {
              id: true,
              username: true,
              name: true,
              email: true,
              role: true,
              avatar: true
            }
          },
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });
      
      return queries;
    } catch (error) {
      console.error('Error fetching donor queries:', error);
      throw error; // Throw the error instead of swallowing it
    }
  }

  async resolveQuery(id: number, resolvedById: number) {
    // Ensure the query exists
    const query = await this.findOne(id);
    
    // Validate resolvedById
    if (!resolvedById) {
      throw new Error('User ID is required to resolve a query');
    }
    
    // Get the user who is resolving the query
    const user = await this.prisma.user.findUnique({
      where: { id: resolvedById },
    });

    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if the user is a SUPER_ADMIN or the assigned user
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    const isAssignedUser = query.assignedToId === resolvedById;
    
    if (!isSuperAdmin && !isAssignedUser) {
      throw new Error('Only the assigned admin or a super admin can resolve this query');
    }
    
    // Update the query status to RESOLVED
    const updatedQuery = await this.prisma.donorQuery.update({
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
    
    // Create a system message for the query resolution
    await this.messagesService.create({
      content: `Query #${id} has been resolved by ${user.name}`,
      queryId: id,
      senderId: resolvedById,
      messageType: MessageType.SYSTEM,
      isFromAdmin: true,
    });
    
    // End all active calls related to this query
    await this.callsService.endAllActiveCallsForQuery(id);
    
    // Send real-time WebSocket notification
    this.notificationsGateway.notifyQueryStatusChange(
      id, 
      'RESOLVED', 
      user.name
    );
    
    // Additionally send a specific resolution notification
    this.notificationsGateway.notifyQueryResolution(
      id,
      user.name
    );
    
    return updatedQuery;
  }

  async setPendingReply(id: number) {
    // Ensure the query exists
    const query = await this.findOne(id);
    
    const updatedQuery = await this.prisma.donorQuery.update({
      where: { 
        id: id 
      },
      data: {
        status: QueryStatus.PENDING_REPLY,
      },
    });
    
    // Send real-time WebSocket notification
    this.notificationsGateway.notifyQueryStatusChange(
      id, 
      'PENDING_REPLY'
    );
    
    return updatedQuery;
  }

  async setInProgress(id: number) {
    // Ensure the query exists
    const query = await this.findOne(id);
    
    const updatedQuery = await this.prisma.donorQuery.update({
      where: { 
        id: id 
      },
      data: {
        status: QueryStatus.IN_PROGRESS,
      },
    });
    
    // Send real-time WebSocket notification
    this.notificationsGateway.notifyQueryStatusChange(
      id, 
      'IN_PROGRESS'
    );
    
    return updatedQuery;
  }

  async transferQuery(id: number, transferredToUserId: number, transferredTo: string, transferNote?: string) {
    // Ensure the query exists
    const query = await this.findOne(id);
    
    // Check if transferredToUserId is valid
    if (!transferredToUserId || isNaN(transferredToUserId)) {
      throw new Error('Invalid transferredToUserId: must be a valid number');
    }
    
    // Get the user who the query is being transferred to
    const user = await this.prisma.user.findUnique({
      where: { id: transferredToUserId },
    });

    if (!user) {
      throw new Error('User not found');
    }
    
    // Update the query status to TRANSFERRED
    const updatedQuery = await this.prisma.donorQuery.update({
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
    
    // Create a system message for the query transfer
    const noteMessage = transferNote ? ` with note: "${transferNote}"` : '';
    await this.messagesService.create({
      content: `Query #${id} has been transferred to ${transferredTo}${noteMessage}`,
      queryId: id,
      senderId: transferredToUserId,
      messageType: MessageType.SYSTEM,
      isFromAdmin: true,
    });
    
    // End all active calls related to this query
    await this.callsService.endAllActiveCallsForQuery(id);
    
    // Send real-time WebSocket notification
    this.notificationsGateway.notifyQueryTransfer(
      id, 
      transferredTo, 
      transferredToUserId
    );
    this.notificationsGateway.notifyQueryStatusChange(
      id, 
      'TRANSFERRED',
      user.name
    );
    
    return updatedQuery;
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

      // Send real-time WebSocket notification
      this.notificationsGateway.notifyQueryAssignment(id, userId);
      this.notificationsGateway.notifyQueryStatusChange(id, 'IN_PROGRESS', user.name);

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

  async donorCloseQuery(id: number, donorId: string) {
    try {
      // Ensure the query exists
      const query = await this.findOne(id);
      
      // Verify this is the donor's query
      if (query.donorId !== donorId) {
        throw new Error('You are not authorized to close this query');
      }
      
      // Check if the query is already resolved or transferred
      if (query.status === QueryStatus.RESOLVED || query.status === QueryStatus.TRANSFERRED) {
        throw new Error('Query is already closed');
      }
      
      // Update the query status to RESOLVED
      const updatedQuery = await this.prisma.donorQuery.update({
        where: { id },
        data: {
          status: QueryStatus.RESOLVED,
        },
      });
      
      // Create a system message for the query closure
      await this.messagesService.create({
        content: `Query #${id} has been closed by the donor`,
        queryId: id,
        messageType: MessageType.SYSTEM,
        isFromAdmin: false,
      });
      
      // End all active calls related to this query
      await this.callsService.endAllActiveCallsForQuery(id);
      
      // Send real-time WebSocket notification
      this.notificationsGateway.notifyQueryStatusChange(
        id, 
        'RESOLVED', 
        'Donor'
      );
      
      // Additionally notify all connected clients about the query being closed by donor
      this.notificationsGateway.notifyQueryResolution(
        id,
        'Donor'
      );
      
      return updatedQuery;
    } catch (error) {
      console.error('Error closing query by donor:', error);
      throw error;
    }
  }
} 