import { Controller, Get, Post, Body, Param, Put, UseGuards, Version, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CallsService } from './services/calls.service';
import { CreateCallDto } from './dto/create-call.dto';
import { UpdateCallDto } from './dto/update-call.dto';
import { Call, CallStatus } from './entities/call.entity';

@ApiTags('calls')
@Controller({
  path: 'calls',
  version: '1',
})
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  @Version('1')
  @ApiOperation({ summary: 'Create a new call' })
  @ApiResponse({ status: 201, description: 'The call has been successfully created.', type: Call })
  async create(@Body() createCallDto: CreateCallDto, @Req() request) {
    const call = await this.callsService.create(createCallDto);
    
    // If request is from a donor (no JWT auth), only return userToken
    const isAdminRequest = request.user?.role === 'ADMIN' || request.user?.role === 'SUPER_ADMIN';
    
    if (!isAdminRequest && createCallDto.initiatedBy === 'donor') {
      // Return a sanitized response without adminToken for donors
      const { adminToken, ...sanitizedCall } = call;
      return sanitizedCall;
    }
    
    // Return full response with both tokens for admins
    return call;
  }

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all calls' })
  @ApiResponse({ status: 200, description: 'List of calls', type: [Call] })
  async findAll() {
    return this.callsService.findAll();
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get a call by ID' })
  @ApiResponse({ status: 200, description: 'Call details', type: Call })
  async findOne(@Param('id') id: string, @Req() request) {
    const call = await this.callsService.findOne(id);
    
    // Check if request is authenticated as admin
    const isAdminRequest = request.user?.role === 'ADMIN' || request.user?.role === 'SUPER_ADMIN';
    
    if (!isAdminRequest) {
      // Return a sanitized response without adminToken for non-admin requests
      const { adminToken, ...sanitizedCall } = call;
      return sanitizedCall;
    }
    
    return call;
  }

  @Put(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a call' })
  @ApiResponse({ status: 200, description: 'Call has been updated', type: Call })
  async update(@Param('id') id: string, @Body() updateCallDto: UpdateCallDto) {
    return this.callsService.update(id, updateCallDto);
  }

  @Get('ticket/:ticketId')
  @Version('1')
  @ApiOperation({ summary: 'Get calls for a ticket' })
  @ApiResponse({ status: 200, description: 'List of calls for the ticket', type: [Call] })
  async findByTicket(@Param('ticketId') ticketId: string, @Req() request) {
    const calls = await this.callsService.findByTicket(ticketId);
    
    // Check if request is authenticated as admin
    const isAdminRequest = request.user?.role === 'ADMIN' || request.user?.role === 'SUPER_ADMIN';
    
    if (!isAdminRequest) {
      // Return sanitized calls without adminToken for non-admin requests
      return calls.map(call => {
        const { adminToken, ...sanitizedCall } = call;
        return sanitizedCall;
      });
    }
    
    return calls;
  }

  @Post(':id/end')
  @Version('1')
  @ApiOperation({ summary: 'End an active call' })
  @ApiResponse({ status: 200, description: 'Call has been ended', type: Call })
  async endCall(@Param('id') id: string, @Req() request) {
    const call = await this.callsService.findOne(id);
    
    // Update the call to ended status
    const updatedCall = await this.callsService.update(id, { status: CallStatus.ENDED });
    
    // Check if request is authenticated as admin
    const isAdminRequest = request.user?.role === 'ADMIN' || request.user?.role === 'SUPER_ADMIN';
    
    if (!isAdminRequest) {
      // Return a sanitized response without adminToken for non-admin requests
      const { adminToken, ...sanitizedCall } = updatedCall;
      return sanitizedCall;
    }
    
    return updatedCall;
  }
} 