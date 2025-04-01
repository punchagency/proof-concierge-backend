import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private isInitialized = false;
  private frontendUrl: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initialize();
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  private initialize() {
    try {
      const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
      if (!apiKey) {
        this.logger.warn('SendGrid API key not found. Email notifications will be disabled.');
        return;
      }

      sgMail.setApiKey(apiKey);
      this.isInitialized = true;
      this.logger.log('SendGrid initialized successfully');
    } catch (error) {
      this.logger.error(`Error initializing SendGrid: ${error.message}`, error.stack);
    }
  }

  /**
   * Get email addresses for all admin users
   * @returns Array of admin email addresses
   */
  private async getAdminEmails(): Promise<string[]> {
    try {
      // Find all admin and super admin users
      const admins = await this.prisma.user.findMany({
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.SUPER_ADMIN]
          }
        },
        select: {
          email: true
        }
      });
      
      // Use type predicate to ensure we only return non-null email strings
      const emails = admins
        .map(admin => admin.email)
        .filter((email): email is string => typeof email === 'string' && email.length > 0);
        
      const uniqueEmails = Array.from(new Set(emails));
      this.logger.log(`Found ${uniqueEmails.length} unique admin emails for notification`);
      return uniqueEmails;
    } catch (error) {
      this.logger.error(`Error getting admin emails: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Send email notification about a new query to all admins
   * @param queryId Query ID
   * @param donor Donor email or name
   * @param donorId Donor ID
   * @param test Test name
   * @param stage Test stage
   * @param device Device information
   * @param content Query content/message
   */
  async sendNewQueryNotification(
    queryId: number,
    donor: string,
    test: string,
    stage: string,
    device: string,
    content?: string,
    donorId?: string,
  ): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.warn('SendGrid not initialized. Skipping email notification.');
      return false;
    }

    try {
      this.logger.log(`Preparing to send new query notification for Query #${queryId}`);
      
      const adminEmails = await this.getAdminEmails();
      if (adminEmails.length === 0) {
        this.logger.warn('No admin email addresses found. Skipping notification.');
        return false;
      }

      const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');
      if (!fromEmail) {
        this.logger.warn('Sender email not configured. Skipping notification.');
        return false;
      }

      const queryLink = `${this.frontendUrl}/donor-queries/${queryId}`;

      // Create email content
      const msg = {
        to: adminEmails,
        from: fromEmail,
        subject: `New Query #${queryId}: ${test} from ${donor}`,
        html: `
          <h2>New Donor Query Received</h2>
          <p><strong>Query ID:</strong> ${queryId}</p>
          <p><strong>Donor:</strong> ${donor}</p>
          ${donorId ? `<p><strong>Donor ID:</strong> ${donorId}</p>` : ''}
          <p><strong>Test:</strong> ${test}</p>
          <p><strong>Stage:</strong> ${stage}</p>
          <p><strong>Device:</strong> ${device}</p>
          ${content ? `<p><strong>Message:</strong> ${content}</p>` : ''}
          <p><a href="${queryLink}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-top: 15px; display: inline-block;">View Query</a></p>
        `,
      };

      this.logger.log(`Sending new query notification email to ${adminEmails.length} admins for Query #${queryId}`);
      
      // Send the email
      await sgMail.send(msg);
      this.logger.log(`✅ New query notification email successfully sent to ${adminEmails.length} admins for Query #${queryId}`);
      return true;
    } catch (error) {
      const detailedError = error.response ? JSON.stringify(error.response.body) : error.message;
      this.logger.error(`❌ Error sending new query notification for Query #${queryId}: ${detailedError}`, error.stack);
      return false;
    }
  }

  /**
   * Send email notification about a call request to the assigned admin
   * @param queryId Query ID
   * @param adminId Assigned admin ID
   * @param message Optional message
   */
  async sendCallRequestNotification(
    queryId: number,
    adminId: number,
    message?: string,
  ): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.warn('SendGrid not initialized. Skipping email notification.');
      return false;
    }

    try {
      this.logger.log(`Preparing to send call request notification for Query #${queryId} to Admin #${adminId}`);
      
      // Find the assigned admin
      const admin = await this.prisma.user.findUnique({
        where: {
          id: adminId,
        },
        select: {
          email: true,
          name: true,
        },
      });

      if (!admin?.email) {
        this.logger.warn(`Admin with ID ${adminId} not found or has no email. Skipping notification.`);
        return false;
      }

      const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');
      if (!fromEmail) {
        this.logger.warn('Sender email not configured. Skipping notification.');
        return false;
      }

      // Get query details for more context
      const query = await this.prisma.donorQuery.findUnique({
        where: { id: queryId },
        select: {
          donor: true,
          donorId: true,
          test: true,
        },
      });

      if (!query) {
        this.logger.warn(`Query with ID ${queryId} not found. Skipping notification.`);
        return false;
      }

      const queryLink = `${this.frontendUrl}/donor-queries/${queryId}`;

      // Create email content
      const msg = {
        to: admin.email,
        from: fromEmail,
        subject: `Call Request: Query #${queryId} from ${query.donor}`,
        html: `
          <h2>New Call Request</h2>
          <p>A donor has requested a call for:</p>
          <p><strong>Query ID:</strong> ${queryId}</p>
          <p><strong>Donor:</strong> ${query.donor}</p>
          ${query.donorId ? `<p><strong>Donor ID:</strong> ${query.donorId}</p>` : ''}
          <p><strong>Test:</strong> ${query.test}</p>
          ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
          <p><a href="${queryLink}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-top: 15px; display: inline-block;">View Call Request</a></p>
        `,
      };

      this.logger.log(`Sending call request notification email to ${admin.email} (${admin.name || 'Unknown Admin'}) for Query #${queryId}`);
      
      // Send the email
      await sgMail.send(msg);
      this.logger.log(`✅ Call request notification email successfully sent to ${admin.email} for Query #${queryId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error sending call request notification for Query #${queryId}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Send email notification to an admin when a query is transferred to them
   * @param queryId Query ID
   * @param adminId Admin ID who received the transferred query
   * @param transferredBy Name of the admin who transferred the query
   * @param transferNote Optional note about the transfer
   */
  async sendQueryTransferNotification(
    queryId: number,
    adminId: number,
    transferredBy?: string,
    transferNote?: string,
  ): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.warn('SendGrid not initialized. Skipping email notification.');
      return false;
    }

    try {
      this.logger.log(`Preparing to send query transfer notification for Query #${queryId} to Admin #${adminId}`);
      
      // Find the admin who received the transfer
      const admin = await this.prisma.user.findUnique({
        where: {
          id: adminId,
        },
        select: {
          email: true,
          name: true,
        },
      });

      if (!admin?.email) {
        this.logger.warn(`Admin with ID ${adminId} not found or has no email. Skipping notification.`);
        return false;
      }

      const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');
      if (!fromEmail) {
        this.logger.warn('Sender email not configured. Skipping notification.');
        return false;
      }

      // Get query details for more context
      const query = await this.prisma.donorQuery.findUnique({
        where: { id: queryId },
        select: {
          donor: true,
          donorId: true,
          test: true,
          stage: true,
          device: true,
        },
      });

      if (!query) {
        this.logger.warn(`Query with ID ${queryId} not found. Skipping notification.`);
        return false;
      }

      const queryLink = `${this.frontendUrl}/donor-queries/${queryId}`;

      // Create email content
      const msg = {
        to: admin.email,
        from: fromEmail,
        subject: `Query Transfer: Query #${queryId} from ${query.donor} assigned to you`,
        html: `
          <h2>Query Transferred to You</h2>
          <p>A donor query has been transferred to you:</p>
          <p><strong>Query ID:</strong> ${queryId}</p>
          <p><strong>Donor:</strong> ${query.donor}</p>
          ${query.donorId ? `<p><strong>Donor ID:</strong> ${query.donorId}</p>` : ''}
          <p><strong>Test:</strong> ${query.test}</p>
          <p><strong>Stage:</strong> ${query.stage}</p>
          <p><strong>Device:</strong> ${query.device}</p>
          ${transferredBy ? `<p><strong>Transferred By:</strong> ${transferredBy}</p>` : ''}
          ${transferNote ? `<p><strong>Transfer Note:</strong> ${transferNote}</p>` : ''}
          <p><a href="${queryLink}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-top: 15px; display: inline-block;">View Query</a></p>
        `,
      };

      this.logger.log(`Sending query transfer notification email to ${admin.email} (${admin.name || 'Unknown Admin'}) for Query #${queryId}`);
      
      // Send the email
      await sgMail.send(msg);
      this.logger.log(`✅ Query transfer notification email successfully sent to ${admin.email} for Query #${queryId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error sending query transfer notification for Query #${queryId}: ${error.message}`, error.stack);
      return false;
    }
  }
} 