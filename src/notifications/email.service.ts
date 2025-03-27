import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private isInitialized = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initialize();
  }

  private initialize() {
    try {
      const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
      if (!apiKey) {
        this.logger.warn('SendGrid API key not configured. Email notifications will be disabled.');
        return;
      }

      sgMail.setApiKey(apiKey);
      this.isInitialized = true;
      this.logger.log('SendGrid email service initialized successfully');
    } catch (error) {
      this.logger.error(`Error initializing SendGrid: ${error.message}`, error.stack);
    }
  }

  /**
   * Get all admin email addresses
   * @returns Array of admin email addresses
   */
  async getAdminEmails(): Promise<string[]> {
    try {
      // Find all admin and super admin users with email addresses
      const admins = await this.prisma.user.findMany({
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
          },
          email: {
            not: null,
          },
          isActive: true,
        },
        select: {
          email: true,
        },
      });

      // Extract email addresses from users and filter out any null values
      const emails = admins
        .map((admin) => admin.email)
        .filter((email): email is string => !!email);

      this.logger.log(`Found ${emails.length} admin email addresses`);
      return emails;
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
        `,
      };

      // Send the email
      await sgMail.send(msg);
      this.logger.log(`New query notification email sent to ${adminEmails.length} admins`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending new query notification: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Send email notification about a call request to the assigned admin
   * @param queryId Query ID
   * @param adminId Assigned admin ID
   * @param callMode Call mode (VIDEO, AUDIO, SCREEN)
   * @param message Optional message
   */
  async sendCallRequestNotification(
    queryId: number,
    adminId: number,
    callMode: string,
    message?: string,
  ): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.warn('SendGrid not initialized. Skipping email notification.');
      return false;
    }

    try {
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

      // Create email content
      const msg = {
        to: admin.email,
        from: fromEmail,
        subject: `Call Request: Query #${queryId} from ${query.donor}`,
        html: `
          <h2>New Call Request</h2>
          <p>A donor has requested a ${callMode} call for:</p>
          <p><strong>Query ID:</strong> ${queryId}</p>
          <p><strong>Donor:</strong> ${query.donor}</p>
          ${query.donorId ? `<p><strong>Donor ID:</strong> ${query.donorId}</p>` : ''}
          <p><strong>Test:</strong> ${query.test}</p>
          ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
        `,
      };

      // Send the email
      await sgMail.send(msg);
      this.logger.log(`Call request notification email sent to ${admin.email}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending call request notification: ${error.message}`, error.stack);
      return false;
    }
  }
} 