import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggingService } from '../logging.service';
import { Request, Response } from 'express';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly loggingService: LoggingService) {
    this.loggingService.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    
    // Extract userId, ensuring it's either a string/number or undefined
    let userId: string | number | undefined;
    if (request.user && (request.user as any).id) {
      userId = (request.user as any).id;
    }
    
    // Don't log health check endpoints to avoid noise
    if (url.includes('/health') && !process.env.LOG_HEALTH_CHECKS) {
      return next.handle();
    }
    
    // Mask sensitive data in request body
    const maskedBody = this.maskSensitiveData(request.body);
    
    // Log the request
    this.loggingService.logRequest(method, url, userId, ip, userAgent, maskedBody);

    const now = Date.now();
    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse<Response>();
          const delay = Date.now() - now;
          
          this.loggingService.logResponse(method, url, response.statusCode, delay);
        },
        error: (error) => {
          const delay = Date.now() - now;
          
          this.loggingService.error(
            `Request failed: ${method} ${url}`,
            error.stack,
            {
              statusCode: error.status || 500,
              errorName: error.name,
              errorMessage: error.message,
              responseTime: delay
            }
          );
        }
      })
    );
  }
  
  private maskSensitiveData(data: any): any {
    if (!data) return {};
    
    try {
      // Create a deep copy to avoid modifying the original
      const masked = JSON.parse(JSON.stringify(data));
      
      // List of sensitive fields to mask
      const sensitiveFields = ['password', 'token', 'secret', 'credit_card', 'ssn', 'key', 'jwt'];
      
      // Recursive function to mask sensitive data
      const maskObject = (obj: any) => {
        if (typeof obj !== 'object' || obj === null) return;
        
        Object.keys(obj).forEach(key => {
          if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object') {
            maskObject(obj[key]);
          }
        });
      };
      
      maskObject(masked);
      return masked;
    } catch (error) {
      // If serialization fails, return empty object rather than crashing
      return { serializationError: true };
    }
  }
} 