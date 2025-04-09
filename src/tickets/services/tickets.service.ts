import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { UpdateTicketDto } from '../dto/update-ticket.dto';
import { TransferTicketDto } from '../dto/transfer-ticket.dto';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { CallStatus } from '../../calls/entities/call.entity';
import { TextMessagesGateway } from '../../text-messages/text-messages.gateway';
import * as crypto from 'crypto';
import { EmailService } from '../../notifications/email.service';
import { nanoid } from 'nanoid';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private textMessagesGateway: TextMessagesGateway,
    private emailService: EmailService,
  ) {}

  // Helper method to generate a short ID (5 characters)
  private generateShortId(length = 5): string {
    // Use a mix of uppercase letters and numbers for better readability
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters like 0, O, 1, I
    let result = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      const randomByte = randomBytes[i] % characters.length;
      result += characters.charAt(randomByte);
    }

    return result;
  }

  async create(createTicketDto: CreateTicketDto): Promise<Ticket> {
    // Generate a unique short ID
    let shortId;
    let existingTicket;
    do {
      shortId = nanoid(6);
      existingTicket = await this.prisma.ticket.findUnique({
        where: { id: shortId },
      });
    } while (existingTicket);

    // Create the ticket with the unique short ID
    const ticket = (await this.prisma.ticket.create({
      data: {
        id: shortId, // Use the short ID instead of letting Prisma generate a UUID
        donorId: createTicketDto.donorId,
        donorEmail: createTicketDto.donorEmail,
        description: createTicketDto.description,
        callRequested: createTicketDto.callRequested,
        callType: createTicketDto.callType,
        status: TicketStatus.NEW,
      },
    })) as unknown as Ticket;

    // Create a text message with the ticket description if provided
    if (createTicketDto.description) {
      await this.prisma.textMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: createTicketDto.donorId,
          senderType: 'donor',
          content: createTicketDto.description,
        },
      });
    }

    // Emit event for new ticket
    this.textMessagesGateway.notifyNewTicket(ticket);

    // Send email notification
    if (createTicketDto.donorEmail) {
      await this.emailService.sendNewQueryNotification(
        ticket.id, // Convert string ID to number
        createTicketDto.donorEmail,
        'Ticket Support', // Using a generic test name for tickets
        'Initial Request', // Using a generic stage for tickets
        'Web', // Using a generic device for tickets
        createTicketDto.description, // Using description as content
        createTicketDto.donorId,
        createTicketDto.callType,
      );
    }

    return ticket;
  }

  async findAll(status?: string): Promise<Ticket[]> {
    return this.prisma.ticket.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    }) as unknown as Ticket[];
  }

  async findOne(id: string): Promise<any> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        activeCall: true,
        admin: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    // If there's an active call, include its details in the response
    if (ticket.activeCallId && ticket.activeCall) {
      return {
        ...ticket,
        activeCall: {
          id: ticket.activeCall.id,
          dailyRoomUrl: ticket.activeCall.dailyRoomUrl,
          adminToken: ticket.activeCall.adminToken,
          userToken: ticket.activeCall.userToken,
          status: ticket.activeCall.status,
          callType: ticket.activeCall.callType,
          startedAt: ticket.activeCall.startedAt,
        },
      };
    }

    return ticket as unknown as Ticket;
  }

  async update(id: string, updateTicketDto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const updatedTicket = (await this.prisma.ticket.update({
      where: { id },
      data: updateTicketDto,
    })) as unknown as Ticket;

    // If status changed, emit event
    if (updateTicketDto.status && updateTicketDto.status !== ticket.status) {
      this.textMessagesGateway.notifyTicketStatusChanged(
        id,
        ticket.status,
        updateTicketDto.status,
        updatedTicket.adminId || undefined,
      );
    }

    return updatedTicket;
  }

  async assignToAdmin(id: string, adminId: number): Promise<any> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        activeCall: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const oldStatus = ticket.status;

    // Determine the new status - preserve ACTIVE_CALL if there's an active call
    const newStatus =
      ticket.activeCallId && ticket.activeCall?.status === CallStatus.ACTIVE
        ? TicketStatus.ACTIVE_CALL
        : TicketStatus.PENDING;

    const updatedTicket = (await this.prisma.ticket.update({
      where: { id },
      data: {
        adminId,
        status: newStatus,
      },
    })) as unknown as Ticket;

    // Emit status change event
    this.textMessagesGateway.notifyTicketStatusChanged(
      id,
      oldStatus,
      newStatus,
      adminId,
    );

    // If there's an active call, fetch its details to include in the response
    if (updatedTicket.activeCallId) {
      const activeCall = await this.prisma.call.findUnique({
        where: { id: updatedTicket.activeCallId as string },
        select: {
          id: true,
          dailyRoomUrl: true,
          adminToken: true,
          userToken: true,
          status: true,
          callType: true,
          startedAt: true,
        },
      });

      if (activeCall && activeCall.status === CallStatus.ACTIVE) {
        return {
          ...updatedTicket,
          activeCall: {
            id: activeCall.id,
            dailyRoomUrl: activeCall.dailyRoomUrl,
            adminToken: activeCall.adminToken,
            userToken: activeCall.userToken,
            status: activeCall.status,
            callType: activeCall.callType,
            startedAt: activeCall.startedAt,
          },
        };
      }
    }

    return updatedTicket;
  }

  async transferTicket(
    id: string,
    fromAdminId: number,
    transferDto: TransferTicketDto,
  ): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    // Get the admin who is transferring the ticket
    const fromAdmin = await this.prisma.user.findUnique({
      where: { id: fromAdminId },
      select: { name: true },
    });

    const oldStatus = ticket.status;

    // Perform the transfer in a transaction
    const updatedTicket = (await this.prisma.$transaction(async (tx) => {
      // Create transfer record
      await tx.ticketTransfer.create({
        data: {
          ticketId: id,
          fromAdminId,
          toAdminId: transferDto.toAdminId,
          transferNotes: transferDto.transferNotes,
        },
      });

      // Update the ticket
      return tx.ticket.update({
        where: { id },
        data: {
          adminId: transferDto.toAdminId,
          status: TicketStatus.TRANSFERRED,
        },
      });
    })) as unknown as Ticket;

    // Emit ticket transferred event
    this.textMessagesGateway.notifyTicketTransferred(
      id,
      fromAdminId,
      transferDto.toAdminId,
    );

    // Also emit status change event
    this.textMessagesGateway.notifyTicketStatusChanged(
      id,
      oldStatus,
      TicketStatus.TRANSFERRED,
      transferDto.toAdminId,
    );

    // Send email notification to the admin who received the transfer
    await this.emailService.sendQueryTransferNotification(
      parseInt(id, 10), // Convert string ID to number
      transferDto.toAdminId,
      fromAdmin?.name || 'an admin',
      transferDto.transferNotes,
    );

    return updatedTicket;
  }

  async closeTicket(id: string): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const oldStatus = ticket.status;
    const updatedTicket = (await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.CLOSED,
      },
    })) as unknown as Ticket;

    // Emit status change event
    this.textMessagesGateway.notifyTicketStatusChanged(
      id,
      oldStatus,
      TicketStatus.CLOSED,
      ticket.adminId || undefined,
    );

    return updatedTicket;
  }

  async resolveTicket(id: string): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const oldStatus = ticket.status;
    const updatedTicket = (await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.RESOLVED,
      },
    })) as unknown as Ticket;

    // Emit status change event
    this.textMessagesGateway.notifyTicketStatusChanged(
      id,
      oldStatus,
      TicketStatus.RESOLVED,
      ticket.adminId || undefined,
    );

    return updatedTicket;
  }

  async getTicketTransfers(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    return this.prisma.ticketTransfer.findMany({
      where: { ticketId: id },
      orderBy: { transferredAt: 'desc' },
      include: {
        fromAdmin: true,
        toAdmin: true,
      },
    });
  }

  async findByDonorId(donorId: string): Promise<Partial<Ticket>[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: { donorId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        callType: true,
      },
    });

    return tickets as Partial<Ticket>[];
  }

  async findTicketForDonor(ticketId: string, donorId: string): Promise<any> {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        donorId,
      },
      include: {
        calls: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            status: true,
            callType: true,
            dailyRoomUrl: true,
            userToken: true,
            initiatedBy: true,
            startedAt: true,
            endedAt: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket not found or donor ID doesn't match`);
    }

    // Create a donor-safe response
    const safeTicket = {
      id: ticket.id,
      donorId: ticket.donorId,
      donorEmail: ticket.donorEmail,
      description: ticket.description,
      status: ticket.status,
      callRequested: ticket.callRequested,
      callType: ticket.callType,
      activeCallId: ticket.activeCallId,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      activeCall:
        ticket.activeCallId && ticket.calls.length > 0
          ? ticket.calls[0].status === 'active'
            ? {
                id: ticket.calls[0].id,
                callType: ticket.calls[0].callType,
                dailyRoomUrl: ticket.calls[0].dailyRoomUrl,
                userToken: ticket.calls[0].userToken,
                status: ticket.calls[0].status,
                startedAt: ticket.calls[0].startedAt,
              }
            : null
          : null,
    };

    return safeTicket;
  }

  async resolveTicketByDonor(
    ticketId: string,
    donorId: string,
  ): Promise<Ticket> {
    // First verify this is the donor's ticket
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        donorId,
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket not found or donor ID doesn't match`);
    }

    const oldStatus = ticket.status;

    // If there's an active call, end it as part of the transaction
    if (ticket.activeCallId) {
      const updatedTicket = (await this.prisma.$transaction(async (tx) => {
        // End the active call
        await tx.call.update({
          where: { id: ticket.activeCallId as string },
          data: {
            status: CallStatus.ENDED,
            endedAt: new Date(),
          },
        });

        // Update the ticket
        return tx.ticket.update({
          where: { id: ticketId },
          data: {
            status: TicketStatus.RESOLVED,
            activeCallId: null,
          },
        });
      })) as unknown as Ticket;

      // Emit call ended event
      this.textMessagesGateway.notifyCallEnded(
        ticketId,
        ticket.activeCallId as string,
      );

      // Emit status change event
      this.textMessagesGateway.notifyTicketStatusChanged(
        ticketId,
        oldStatus,
        TicketStatus.RESOLVED,
      );

      return updatedTicket;
    } else {
      // No active call, just resolve the ticket
      const updatedTicket = (await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.RESOLVED,
        },
      })) as unknown as Ticket;

      // Emit status change event
      this.textMessagesGateway.notifyTicketStatusChanged(
        ticketId,
        oldStatus,
        TicketStatus.RESOLVED,
      );

      return updatedTicket;
    }
  }

  async getDashboardTickets(adminId?: number): Promise<any> {
    // Get all new tickets - these can be either unassigned or assigned
    const newTickets = await this.prisma.ticket.findMany({
      where: {
        status: TicketStatus.NEW,
        // If adminId provided, return both unassigned tickets AND tickets assigned to this admin
        ...(adminId
          ? {
              OR: [
                { adminId: null }, // Unassigned tickets
                { adminId }, // Tickets assigned to this admin
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    const pendingTickets = await this.prisma.ticket.findMany({
      where: {
        status: TicketStatus.PENDING,
        ...(adminId ? { adminId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // Get active call tickets with admin assigned
    const activeCallTickets = await this.prisma.ticket.findMany({
      where: {
        status: TicketStatus.ACTIVE_CALL,
        ...(adminId ? { adminId } : {}),
        adminId: { not: null }, // Only get tickets with admin assigned
      },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        calls: {
          where: { status: 'active' },
          take: 1,
        },
      },
    });

    // Get active call tickets that don't have an admin assigned - separate query
    const unassignedActiveCallTickets = await this.prisma.ticket.findMany({
      where: {
        status: TicketStatus.ACTIVE_CALL,
        adminId: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        calls: {
          where: { status: 'active' },
          take: 1,
        },
      },
    });

    // Only include unassigned active call tickets if either no adminId is provided (super admin)
    // or if adminId is provided (regular admin) but we want to show unassigned tickets too
    const allActiveCallTickets = [
      ...activeCallTickets,
      ...unassignedActiveCallTickets,
    ];

    // Tickets currently assigned to the admin with 'transferred' status
    const transferredTickets = await this.prisma.ticket.findMany({
      where: {
        status: TicketStatus.TRANSFERRED,
        ...(adminId ? { adminId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // Calculate counts
    const newCount = newTickets.length;
    const pendingCount = pendingTickets.length;
    const activeCallCount = allActiveCallTickets.length;
    const transferredCount = transferredTickets.length;

    // Count unassigned tickets for each category
    const unassignedNewCount = newTickets.filter((t) => !t.adminId).length;
    const unassignedActiveCallCount = unassignedActiveCallTickets.length;

    return {
      newTickets,
      pendingTickets,
      activeCallTickets: allActiveCallTickets,
      transferredTickets,
      counts: {
        new: newCount,
        pending: pendingCount,
        activeCall: activeCallCount,
        transferred: transferredCount,
        total: newCount + pendingCount + activeCallCount + transferredCount,
        unassigned: {
          new: unassignedNewCount,
          activeCall: unassignedActiveCallCount,
          total: unassignedNewCount + unassignedActiveCallCount,
        },
      },
    };
  }
}
