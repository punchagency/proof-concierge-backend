import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, SenderType, Message } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict this to your frontend domain
  },
  namespace: 'notifications',
  path: '/api/v1/socket.io'
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);
  
  @WebSocketServer()
  server: Server;
  
  // Track connected clients
  private clients = new Map<string, { 
    userId?: number,
    donorId?: string,
    queryIds: Set<number>,
    authenticated: boolean,
    role?: UserRole
  }>();
  
  constructor(private jwtService: JwtService) {}
  
  // Method to get client data by ID
  getClientData(clientId: string) {
    return this.clients.get(clientId);
  }
  
  async handleConnection(client: Socket) {
    try {
      this.logger.log(`Client connected: ${client.id}`);
      this.clients.set(client.id, { queryIds: new Set(), authenticated: false });
      
      // Get token from handshake auth
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn(`Client ${client.id} has no token, connection allowed but not authenticated`);
        return;
      }
      
      // Verify and decode token
      try {
        const decoded = this.jwtService.verify(token);
        client.data.user = decoded;
        
        // Extract user ID from sub claim if it exists
        const userId = decoded.sub || decoded.userId;
        
        this.logger.log(`Authenticated user connected: ${decoded.username || decoded.email} (role: ${decoded.role})`);
        
        // Update client tracking
        const clientData = this.clients.get(client.id);
        if (clientData) {
          clientData.userId = userId;
          clientData.authenticated = true;
          clientData.role = decoded.role;
        }
        
        // Join appropriate rooms based on user role
        if (decoded.role === UserRole.ADMIN || decoded.role === UserRole.SUPER_ADMIN) {
          client.join('admins');
          this.logger.log(`User ${decoded.username || decoded.email} joined admins room`);
        }
        
        // Join user-specific room
        client.join(`user-${userId}`);
        this.logger.log(`User ${decoded.username || decoded.email} joined personal room: user-${userId}`);
        
      } catch (error) {
        this.logger.warn(`Invalid token for client ${client.id}: ${error.message}`);
      }
    } catch (error) {
      this.logger.error(`Error in handleConnection: ${error.message}`);
    }
  }
  
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clients.delete(client.id);
  }
  
  // Enhanced join query room method
  @SubscribeMessage('joinQueryRoom')
  handleJoinQueryRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { queryId: number, donorId?: string }
  ) {
    const clientData = this.clients.get(client.id);
    
    if (!clientData) {
      return { success: false, message: 'Client not found' };
    }
    
    const roomName = `query-${data.queryId}`;
    client.join(roomName);
    
    // Track which query rooms this client has joined
    clientData.queryIds.add(data.queryId);
    
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
  
  @SubscribeMessage('leaveQueryRoom')
  handleLeaveQueryRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { queryId: number }
  ) {
    const clientData = this.clients.get(client.id);
    if (!clientData) {
      return { success: false, message: 'Client not found' };
    }
    
    const roomName = `query-${data.queryId}`;
    client.leave(roomName);
    
    // Remove from tracked queries
    clientData.queryIds.delete(data.queryId);
    
    this.logger.log(`Client ${client.id} left room: ${roomName}`);
    
    return { success: true, message: `Left room: ${roomName}` };
  }
  
  // Method to emit a better formatted message to clients
  emitEnhancedMessage(queryId: number, message: any) {
    // Format the message with sender details
    const formattedMessage = {
      id: message.id,
      content: message.content,
      queryId: message.queryId,
      messageType: message.messageType,
      senderType: message.senderType,
      createdAt: message.createdAt,
      
      // Include appropriate sender information based on type
      sender: message.senderType === SenderType.ADMIN ? {
        id: message.senderId,
        name: message.sender?.name || 'Admin',
        avatar: message.sender?.avatar
      } : message.senderType === SenderType.DONOR ? {
        donorId: message.donorId,
        name: message.donorName || 'Donor'
      } : {
        system: true,
        name: 'System'
      },
      
      // Include any call information if present
      callSessionId: message.callSessionId,
      roomName: message.roomName,

      // Add sender identifiers to help clients filter their own messages
      senderIdentifiers: {
        senderId: message.senderId || null,
        donorId: message.donorId || null
      }
    };
    
    // Emit to all clients in the query room
    // Clients will need to filter out their own messages client-side
    this.server.to(`query-${queryId}`).emit('enhancedMessage', formattedMessage);
    
    this.logger.log(`Emitted enhancedMessage for query ${queryId}, message ID: ${message.id}`);
    
    return formattedMessage;
  }
  
  // Methods to emit events to clients
  
  /**
   * Notify about a new query
   */
  notifyNewQuery(queryId: number, donorInfo: string) {
    this.server.to('admins').emit('newQuery', {
      queryId,
      donorInfo,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted newQuery event to admins room. Query ID: ${queryId}`);
  }
  
  /**
   * Notify about query status change
   */
  notifyQueryStatusChange(queryId: number, status: string, updatedBy?: string) {
    // Emit to query room
    this.server.to(`query-${queryId}`).emit('queryStatusChange', {
      queryId,
      status,
      updatedBy,
      timestamp: new Date().toISOString(),
    });
    
    // Also emit to admin room so dashboards can update
    this.server.to('admins').emit('queryStatusChange', {
      queryId,
      status,
      updatedBy,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Emitted queryStatusChange event. Query ID: ${queryId}, Status: ${status}`);
  }
  
  /**
   * Legacy method - Notify about new message (for backward compatibility)
   */
  notifyNewMessage(queryId: number, messageId: number, senderId: number, isFromAdmin: boolean) {
    const eventData = {
      queryId,
      messageId,
      senderId,
      isFromAdmin,
      timestamp: new Date().toISOString(),
      // Add a field to help clients identify their own messages
      senderIdentifiers: {
        senderId: senderId || null,
        // Legacy method doesn't have donorId, clients will need to match on senderId
      }
    };
    
    // Emit to all clients in the query room
    // Clients will need to filter out their own messages client-side
    this.server.to(`query-${queryId}`).emit('newMessage', eventData);
    
    this.logger.log(`Emitted legacy newMessage event. Query ID: ${queryId}, Message ID: ${messageId}`);
  }
  
  /**
   * Enhanced method - Notify about new message with full details
   */
  notifyEnhancedMessage(queryId: number, message: Message) {
    return this.emitEnhancedMessage(queryId, message);
  }
  
  /**
   * Notify about query transfer
   */
  notifyQueryTransfer(queryId: number, transferredTo: string, transferredToUserId: number) {
    // Notify admins room
    this.server.to('admins').emit('queryTransfer', {
      queryId,
      transferredTo,
      timestamp: new Date().toISOString(),
    });
    
    // Notify the specific admin who received the transfer
    this.server.to(`user-${transferredToUserId}`).emit('queryAssigned', {
      queryId,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Emitted queryTransfer event. Query ID: ${queryId}, Transferred To: ${transferredTo}`);
  }
  
  /**
   * Notify about query assignment
   */
  notifyQueryAssignment(queryId: number, assignedToUserId: number) {
    this.server.to(`user-${assignedToUserId}`).emit('queryAssigned', {
      queryId,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted queryAssigned event. Query ID: ${queryId}, Assigned To: ${assignedToUserId}`);
  }
  
  /**
   * Notify about query resolution
   */
  notifyQueryResolution(queryId: number, resolvedBy: string) {
    // Notify query room
    this.server.to(`query-${queryId}`).emit('queryResolved', {
      queryId,
      resolvedBy,
      timestamp: new Date().toISOString(),
    });
    
    // Also notify admins room for dashboard updates
    this.server.to('admins').emit('queryResolved', {
      queryId,
      resolvedBy,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Emitted queryResolved event. Query ID: ${queryId}, Resolved By: ${resolvedBy}`);
  }

  /**
   * Notify about call started
   */
  notifyCallStarted(queryId: number, callSession: any, adminId: number) {
    // Notify the query room
    this.server.to(`query-${queryId}`).emit('callStarted', {
      queryId,
      callSession,
      adminId,
      timestamp: new Date().toISOString(),
    });
    
    // Also notify admins room for dashboard updates
    this.server.to('admins').emit('callStarted', {
      queryId,
      callSession,
      adminId,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Emitted callStarted event. Query ID: ${queryId}, Call ID: ${callSession.id}`);
  }
} 