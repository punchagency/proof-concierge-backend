import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
  Query,
  Request,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TicketsService } from './services/tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TransferTicketDto } from './dto/transfer-ticket.dto';
import { Ticket } from './entities/ticket.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CallsService } from '../calls/services/calls.service';
import { InitiatedBy } from '../calls/entities/call.entity';

@ApiTags('tickets')
@Controller({
  path: 'tickets',
  version: '1',
})
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly callsService: CallsService,
  ) {}

  @Post()
  @Version('1')
  @ApiOperation({ summary: 'Create a new ticket' })
  @ApiResponse({
    status: 201,
    description: 'The ticket has been successfully created.',
    type: Ticket,
  })
  async create(@Body() createTicketDto: CreateTicketDto) {
    // Ensure callRequested is true since all tickets should have a call
    const ticketData = { ...createTicketDto, callRequested: true };

    // Create the ticket
    const ticket = await this.ticketsService.create(ticketData);

    // Create a call for the ticket
    const call = await this.callsService.create({
      ticketId: ticket.id,
      callType: ticketData.callType,
      initiatedBy: InitiatedBy.DONOR,
    });

    // Return the ticket with call information
    return {
      ...ticket,
      activeCallId: call.id,
      call: {
        id: call.id,
        dailyRoomUrl: call.dailyRoomUrl,
        status: call.status,
        userToken: call.userToken,
      },
    };
  }

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tickets' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter tickets by status',
  })
  @ApiResponse({ status: 200, description: 'List of tickets', type: [Ticket] })
  async findAll(@Query('status') status?: string) {
    return this.ticketsService.findAll(status);
  }

  @Get('dashboard')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tickets grouped by status for dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Tickets grouped by status categories',
    schema: {
      type: 'object',
      properties: {
        newTickets: {
          type: 'array',
          items: { $ref: '#/components/schemas/Ticket' }
        },
        pendingTickets: {
          type: 'array',
          items: { $ref: '#/components/schemas/Ticket' }
        },
        activeCallTickets: {
          type: 'array',
          items: { $ref: '#/components/schemas/Ticket' }
        },
        transferredTickets: {
          type: 'array',
          items: { $ref: '#/components/schemas/Ticket' }
        },
        counts: {
          type: 'object',
          properties: {
            new: { type: 'number' },
            pending: { type: 'number' },
            activeCall: { type: 'number' },
            transferred: { type: 'number' },
            total: { type: 'number' }
          }
        }
      }
    }
  })
  async getDashboardTickets(@Request() req) {
    // If super admin, get all tickets; otherwise filter by adminId
    const adminId = req.user.role === 'SUPER_ADMIN' ? undefined : req.user.userId;
    console.log('user', req.user);
    return this.ticketsService.getDashboardTickets(adminId);
  }

  @Get(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a ticket by ID' })
  @ApiResponse({ status: 200, description: 'Ticket details', type: Ticket })
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Put(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a ticket' })
  @ApiResponse({
    status: 200,
    description: 'Ticket has been updated',
    type: Ticket,
  })
  async update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(id, updateTicketDto);
  }

  @Put(':id/assign')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a ticket to the current admin' })
  @ApiResponse({
    status: 200,
    description: 'Ticket has been assigned',
    type: Ticket,
  })
  async assignToSelf(@Param('id') id: string, @Request() req) {

    const adminId = req.user.role === 'SUPER_ADMIN' ? undefined : req.user.userId;
    console.log('adminId', adminId);

    return this.ticketsService.assignToAdmin(id, adminId);
  }

  @Post(':id/transfer')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Transfer a ticket to another admin' })
  @ApiResponse({
    status: 200,
    description: 'Ticket has been transferred',
    type: Ticket,
  })
  async transfer(
    @Param('id') id: string,
    @Request() req,
    @Body() transferTicketDto: TransferTicketDto,
  ) {
    return this.ticketsService.transferTicket(
      id,
      req.user.userId,
      transferTicketDto,
    );
  }

  @Put(':id/resolve')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a ticket as resolved' })
  @ApiResponse({
    status: 200,
    description: 'Ticket has been resolved',
    type: Ticket,
  })
  async resolve(@Param('id') id: string) {
    return this.ticketsService.resolveTicket(id);
  }

  @Put(':id/close')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close a ticket' })
  @ApiResponse({
    status: 200,
    description: 'Ticket has been closed',
    type: Ticket,
  })
  async close(@Param('id') id: string) {
    return this.ticketsService.closeTicket(id);
  }

  @Get(':id/transfers')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transfer history for a ticket' })
  @ApiResponse({ status: 200, description: 'List of transfers' })
  async getTransfers(@Param('id') id: string) {
    return this.ticketsService.getTicketTransfers(id);
  }

  @Get('donor/:donorId')
  @Version('1')
  @ApiOperation({ summary: 'Get ticket history for a donor' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of donor tickets with limited fields',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          callType: { type: 'string', nullable: true }
        }
      }
    }
  })
  async findByDonor(@Param('donorId') donorId: string) {
    return this.ticketsService.findByDonorId(donorId);
  }

  @Get(':id/donor/:donorId')
  @Version('1')
  @ApiOperation({ summary: 'Get ticket details for a specific donor' })
  @ApiResponse({
    status: 200,
    description: 'Ticket details including active call if available',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        donorId: { type: 'string' },
        donorEmail: { type: 'string' },
        description: { type: 'string', nullable: true },
        status: { type: 'string' },
        callRequested: { type: 'boolean' },
        callType: { type: 'string', nullable: true },
        activeCallId: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        activeCall: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string' },
            callType: { type: 'string' },
            dailyRoomUrl: { type: 'string' },
            userToken: { type: 'string' },
            status: { type: 'string' },
            startedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  async findTicketForDonor(
    @Param('id') id: string,
    @Param('donorId') donorId: string
  ) {
    return this.ticketsService.findTicketForDonor(id, donorId);
  }

  @Put(':id/donor/:donorId/resolve')
  @Version('1')
  @ApiOperation({ summary: 'Resolve a ticket as donor' })
  @ApiResponse({
    status: 200,
    description: 'Ticket has been resolved by donor',
    type: Ticket
  })
  async resolveDonorTicket(
    @Param('id') id: string,
    @Param('donorId') donorId: string
  ) {
    return this.ticketsService.resolveTicketByDonor(id, donorId);
  }
}
