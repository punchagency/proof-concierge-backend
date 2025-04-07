import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { UpdateTicketDto } from '../dto/update-ticket.dto';
import { TransferTicketDto } from '../dto/transfer-ticket.dto';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { CallStatus } from '../../calls/entities/call.entity';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async create(createTicketDto: CreateTicketDto): Promise<Ticket> {
    return this.prisma.ticket.create({
      data: {
        donorId: createTicketDto.donorId,
        donorEmail: createTicketDto.donorEmail,
        description: createTicketDto.description,
        callRequested: createTicketDto.callRequested,
        callType: createTicketDto.callType,
        status: TicketStatus.NEW,
      },
    }) as unknown as Ticket;
  }

  async findAll(status?: string): Promise<Ticket[]> {
    return this.prisma.ticket.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    }) as unknown as Ticket[];
  }

  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });
    
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
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
    
    return this.prisma.ticket.update({
      where: { id },
      data: updateTicketDto,
    }) as unknown as Ticket;
  }

  async assignToAdmin(id: string, adminId: number): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });
    
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    
    return this.prisma.ticket.update({
      where: { id },
      data: {
        adminId,
        status: TicketStatus.PENDING,
      },
    }) as unknown as Ticket;
  }

  async transferTicket(id: string, fromAdminId: number, transferDto: TransferTicketDto): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });
    
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    
    // Perform the transfer in a transaction
    return this.prisma.$transaction(async (tx) => {
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
    }) as unknown as Ticket;
  }

  async closeTicket(id: string): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });
    
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    
    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.CLOSED,
      },
    }) as unknown as Ticket;
  }

  async resolveTicket(id: string): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });
    
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    
    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.RESOLVED,
      },
    }) as unknown as Ticket;
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
        callType: true
      }
    });
    
    return tickets as Partial<Ticket>[];
  }

  async findTicketForDonor(ticketId: string, donorId: string): Promise<any> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { 
        id: ticketId,
        donorId
      },
      include: {
        calls: {
          orderBy: {
            createdAt: 'desc'
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
            endedAt: true
          }
        }
      }
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
      activeCall: ticket.activeCallId && ticket.calls.length > 0 ? 
        ticket.calls[0].status === 'active' ? {
          id: ticket.calls[0].id,
          callType: ticket.calls[0].callType,
          dailyRoomUrl: ticket.calls[0].dailyRoomUrl,
          userToken: ticket.calls[0].userToken,
          status: ticket.calls[0].status,
          startedAt: ticket.calls[0].startedAt,
        } : null : null
    };
    
    return safeTicket;
  }

  async resolveTicketByDonor(ticketId: string, donorId: string): Promise<Ticket> {
    // First verify this is the donor's ticket
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        donorId
      }
    });
    
    if (!ticket) {
      throw new NotFoundException(`Ticket not found or donor ID doesn't match`);
    }
    
    // If there's an active call, end it as part of the transaction
    if (ticket.activeCallId) {
      return this.prisma.$transaction(async (tx) => {
        // End the active call
        await tx.call.update({
          where: { id: ticket.activeCallId as string },
          data: {
            status: CallStatus.ENDED,
            endedAt: new Date()
          }
        });
        
        // Update the ticket
        return tx.ticket.update({
          where: { id: ticketId },
          data: {
            status: TicketStatus.RESOLVED,
            activeCallId: null
          }
        });
      }) as unknown as Ticket;
    } else {
      // No active call, just resolve the ticket
      return this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.RESOLVED
        }
      }) as unknown as Ticket;
    }
  }
} 