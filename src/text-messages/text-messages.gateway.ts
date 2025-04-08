import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
  path: '/socket',
})
export class TextMessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(TextMessagesGateway.name);

  @WebSocketServer()
  server: Server;

  // Track connected clients
  private clients = new Map<
    string,
    {
      userId?: number;
      donorId?: string;
      ticketIds: Set<string>;
      authenticated: boolean;
      role?: string;
    }
  >();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`Client connected: ${client.id}`);
      this.clients.set(client.id, {
        ticketIds: new Set(),
        authenticated: false,
      });

      // Get token from handshake auth
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(
          `Client ${client.id} has no token, connection allowed but not authenticated`,
        );
        return;
      }

      // Verify and decode token
      try {
        const decoded = this.jwtService.verify(token);
        client.data.user = decoded;

        // Extract user ID from sub claim if it exists
        const userId = decoded.sub || decoded.userId;

        this.logger.log(
          `Authenticated user connected: ${decoded.username || decoded.email} (role: ${decoded.role})`,
        );

        // Update client tracking
        const clientData = this.clients.get(client.id);
        if (clientData) {
          clientData.userId = userId;
          clientData.authenticated = true;
          clientData.role = decoded.role;
        }

        // Join appropriate rooms based on user role
        if (decoded.role === 'ADMIN' || decoded.role === 'SUPER_ADMIN') {
          client.join('admins');
          this.logger.log(
            `User ${decoded.username || decoded.email} joined admins room`,
          );
        }

        // Join user-specific room
        client.join(`user-${userId}`);
        this.logger.log(
          `User ${decoded.username || decoded.email} joined personal room: user-${userId}`,
        );
      } catch (error) {
        this.logger.warn(
          `Invalid token for client ${client.id}: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error in handleConnection: ${error.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clients.delete(client.id);
  }

  // Join ticket room
  @SubscribeMessage('joinTicketRoom')
  handleJoinTicketRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string; donorId?: string },
  ) {
    const clientData = this.clients.get(client.id);

    if (!clientData) {
      return { success: false, message: 'Client not found' };
    }

    const roomName = `ticket-${data.ticketId}`;
    client.join(roomName);

    // Track which ticket rooms this client has joined
    clientData.ticketIds.add(data.ticketId);

    // If provided, store donorId for donor clients
    if (data.donorId) {
      clientData.donorId = data.donorId;
      this.logger.log(`Donor ${data.donorId} joined room: ${roomName}`);
    } else if (clientData.userId) {
      this.logger.log(`User ${clientData.userId} joined room: ${roomName}`);
    } else {
      this.logger.log(`Anonymous client joined room: ${roomName}`);
    }

    return { success: true, message: `Joined room: ${roomName}` };
  }

  @SubscribeMessage('leaveTicketRoom')
  handleLeaveTicketRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const clientData = this.clients.get(client.id);
    if (!clientData) {
      return { success: false, message: 'Client not found' };
    }

    const roomName = `ticket-${data.ticketId}`;
    client.leave(roomName);

    // Remove from tracked tickets
    clientData.ticketIds.delete(data.ticketId);

    this.logger.log(`Client ${client.id} left room: ${roomName}`);

    return { success: true, message: `Left room: ${roomName}` };
  }

  // Emit a new text message to ticket room
  notifyNewTextMessage(ticketId: string, message: any) {
    const formattedMessage = {
      id: message.id,
      content: message.content,
      ticketId: message.ticketId,
      senderType: message.senderType,
      senderId: message.senderId,
      createdAt: message.createdAt,
      isRead: message.isRead,
    };

    this.server
      .to(`ticket-${ticketId}`)
      .emit('newTextMessage', formattedMessage);
    this.logger.log(
      `Emitted newTextMessage for ticket ${ticketId}, message ID: ${message.id}`,
    );

    return formattedMessage;
  }

  // Notify about ticket status change
  notifyTicketStatusChange(ticketId: string, status: string) {
    this.server.to(`ticket-${ticketId}`).emit('ticketStatusChange', {
      ticketId,
      status,
      timestamp: new Date().toISOString(),
    });

    // Also emit to admin room
    this.server.to('admins').emit('ticketStatusChange', {
      ticketId,
      status,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Emitted ticketStatusChange event. Ticket ID: ${ticketId}, Status: ${status}`,
    );
  }

  // Notify about message read status change
  notifyMessagesRead(ticketId: string, senderType: string) {
    this.server.to(`ticket-${ticketId}`).emit('messagesRead', {
      ticketId,
      senderType,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Emitted messagesRead event. Ticket ID: ${ticketId}, SenderType: ${senderType}`);
  }
  
  // Notify when a call starts
  notifyCallStarted(ticketId: string, callData: any) {
    const eventData = {
      ticketId,
      callId: callData.id,
      callType: callData.callType,
      dailyRoomUrl: callData.dailyRoomUrl,
      userToken: callData.userToken, // Token for donor
      initiatedBy: callData.initiatedBy,
      timestamp: new Date().toISOString(),
    };
    
    this.server.to(`ticket-${ticketId}`).emit('activeCallStarted', eventData);
    // Also notify all admins for dashboard updates
    this.server.to('admins').emit('activeCallStarted', eventData);
    
    this.logger.log(`Emitted activeCallStarted event. Ticket ID: ${ticketId}, Call ID: ${callData.id}`);
    
    return eventData;
  }
  
  // Notify when a call ends
  notifyCallEnded(ticketId: string, callId: string) {
    const eventData = {
      ticketId,
      callId,
      timestamp: new Date().toISOString(),
    };
    
    this.server.to(`ticket-${ticketId}`).emit('activeCallEnded', eventData);
    // Also notify all admins for dashboard updates
    this.server.to('admins').emit('activeCallEnded', eventData);
    
    this.logger.log(`Emitted activeCallEnded event. Ticket ID: ${ticketId}, Call ID: ${callId}`);
    
    return eventData;
  }

  // Notify when a new ticket is created
  notifyNewTicket(ticketData: any) {
    const eventData = {
      id: ticketData.id,
      donorId: ticketData.donorId,
      donorEmail: ticketData.donorEmail,
      description: ticketData.description,
      status: ticketData.status,
      callType: ticketData.callType,
      createdAt: ticketData.createdAt,
      timestamp: new Date().toISOString(),
    };
    
    // Broadcast to all admins
    this.server.to('admins').emit('newTicket', eventData);
    this.logger.log(`Emitted newTicket event. Ticket ID: ${ticketData.id}`);
    
    return eventData;
  }
  
  // Notify when a ticket status changes
  notifyTicketStatusChanged(ticketId: string, oldStatus: string, newStatus: string, adminId?: number) {
    const eventData = {
      ticketId,
      oldStatus,
      newStatus,
      adminId,
      timestamp: new Date().toISOString(),
    };
    
    // Notify the specific ticket room
    this.server.to(`ticket-${ticketId}`).emit('ticketStatusChanged', eventData);
    // Also notify all admins for dashboard updates
    this.server.to('admins').emit('ticketStatusChanged', eventData);
    
    this.logger.log(`Emitted ticketStatusChanged event. Ticket ID: ${ticketId}, Status: ${oldStatus} -> ${newStatus}`);
    
    return eventData;
  }
  
  // Notify when a ticket is transferred
  notifyTicketTransferred(ticketId: string, fromAdminId: number, toAdminId: number) {
    const eventData = {
      ticketId,
      fromAdminId,
      toAdminId,
      timestamp: new Date().toISOString(),
    };
    
    // Notify the specific ticket room
    this.server.to(`ticket-${ticketId}`).emit('ticketTransferred', eventData);
    // Also notify specific admins
    this.server.to(`user-${fromAdminId}`).emit('ticketTransferred', eventData);
    this.server.to(`user-${toAdminId}`).emit('ticketTransferred', eventData);
    // Also notify all admins for dashboard updates
    this.server.to('admins').emit('ticketTransferred', eventData);
    
    this.logger.log(`Emitted ticketTransferred event. Ticket ID: ${ticketId}, From: ${fromAdminId}, To: ${toAdminId}`);
    
    return eventData;
  }
}
