import { Injectable, Logger, Scope } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggingService {
  private context: string;
  private logger: winston.Logger;

  constructor() {
    const logDir = path.join(process.cwd(), 'logs');

    // Create logs directory if it doesn't exist
    if (!existsSync(logDir)) {
      mkdirSync(logDir);
    }

    // Create Winston logger with file rotation
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      defaultMeta: { service: 'proof-concierge' },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(
              ({ timestamp, level, message, context, user, ...meta }) => {
                return `[${timestamp}] ${level} [${context || 'Application'}] ${message} ${
                  Object.keys(meta).length ? JSON.stringify(meta) : ''
                }`;
              },
            ),
          ),
        }),

        // Rotating file transport for all logs
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
        }),

        // Separate file for errors only
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, 'errors-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
        }),

        // Separate file for user actions
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, 'user-activity-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
    return this;
  }

  log(message: string, meta: Record<string, any> = {}) {
    this.logger.info(message, { context: this.context, ...meta });
  }

  error(message: string, trace?: string, meta: Record<string, any> = {}) {
    this.logger.error(message, {
      context: this.context,
      trace,
      ...meta,
    });
  }

  warn(message: string, meta: Record<string, any> = {}) {
    this.logger.warn(message, { context: this.context, ...meta });
  }

  debug(message: string, meta: Record<string, any> = {}) {
    this.logger.debug(message, { context: this.context, ...meta });
  }

  // Special method for user activity logging
  logUserActivity(
    userId: number,
    username: string,
    action: string,
    details: Record<string, any> = {},
  ) {
    this.logger.info(`User ${username} (ID: ${userId}) ${action}`, {
      context: 'UserActivity',
      userId,
      username,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to log API requests
  logRequest(
    method: string,
    url: string,
    userId: string | number | undefined,
    ip: string | undefined,
    userAgent: string,
    body: any = {},
  ) {
    this.logger.info(`API Request: ${method} ${url}`, {
      context: 'API',
      method,
      url,
      userId: userId || 'anonymous',
      ip: ip || 'unknown',
      userAgent,
      body,
    });
  }

  // Method to log API responses
  logResponse(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
  ) {
    this.logger.info(
      `API Response: ${method} ${url} ${statusCode} - ${responseTime}ms`,
      {
        context: 'API',
        method,
        url,
        statusCode,
        responseTime: `${responseTime}ms`,
      },
    );
  }

  // Method to log system events
  logSystem(event: string, details: Record<string, any> = {}) {
    this.logger.info(`System: ${event}`, {
      context: 'System',
      event,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }
}
