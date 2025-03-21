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
import { UserRole } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict this to your frontend domain
  },
  namespace: 'notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);
  
  @WebSocketServer()
  server: Server;
  
  constructor(private jwtService: JwtService) {}
  
  async handleConnection(client: Socket) {
    try {
      this.logger.log(`Client connected: ${client.id}`);
      
      // Get token from handshake auth
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn(`Client ${client.id} has no token, disconnecting`);
        client.disconnect();
        return;
      }
      
      // Verify and decode token
      try {
        const decoded = this.jwtService.verify(token);
        client.data.user = decoded;
        this.logger.log(`Authenticated user connected: ${decoded.email} (role: ${decoded.role})`);
        
        // Join appropriate rooms based on user role
        if (decoded.role === UserRole.ADMIN || decoded.role === UserRole.SUPER_ADMIN) {
          client.join('admins');
          this.logger.log(`User ${decoded.email} joined admins room`);
        }
        
        // Join user-specific room
        client.join(`user-${decoded.userId}`);
        this.logger.log(`User ${decoded.email} joined personal room: user-${decoded.userId}`);
        
      } catch (error) {
        this.logger.warn(`Invalid token for client ${client.id}, disconnecting`);
        client.disconnect();
      }
    } catch (error) {
      this.logger.error(`Error in handleConnection: ${error.message}`);
      client.disconnect();
    }
  }
  
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
  
  @SubscribeMessage('joinQueryRoom')
  handleJoinQueryRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { queryId: number }
  ) {
    if (!client.data.user) {
      return { success: false, message: 'Not authenticated' };
    }
    
    const roomName = `query-${data.queryId}`;
    client.join(roomName);
    this.logger.log(`User ${client.data.user.email} joined room: ${roomName}`);
    
    return { success: true, message: `Joined room: ${roomName}` };
  }
  
  @SubscribeMessage('leaveQueryRoom')
  handleLeaveQueryRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { queryId: number }
  ) {
    if (!client.data.user) {
      return { success: false, message: 'Not authenticated' };
    }
    
    const roomName = `query-${data.queryId}`;
    client.leave(roomName);
    this.logger.log(`User ${client.data.user.email} left room: ${roomName}`);
    
    return { success: true, message: `Left room: ${roomName}` };
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
   * Notify about new message
   */
  notifyNewMessage(queryId: number, messageId: number, senderId: number, isFromAdmin: boolean) {
    this.server.to(`query-${queryId}`).emit('newMessage', {
      queryId,
      messageId,
      senderId,
      isFromAdmin,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted newMessage event. Query ID: ${queryId}, Message ID: ${messageId}`);
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
} 