import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { ACTIVITY_KEY } from '../decorators/log-activity.decorator';
import { UserActivityAspect } from '../user-activity.aspect';

@Injectable()
export class ActivityLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly userActivityAspect: UserActivityAspect
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<string>(ACTIVITY_KEY, context.getHandler());
    
    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    
    if (!userId) {
      return next.handle();
    }
    
    // Extract relevant request details for activity logging
    const { method, url, params, query, body } = request;
    const activityDetails = {
      method,
      url,
      params,
      query,
      body: this.sanitizeBody(body)
    };

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Log successful activity
          this.userActivityAspect.logActivity(userId, action, activityDetails);
        },
        error: (error) => {
          // Log failed activity
          this.userActivityAspect.logActivity(userId, `Failed: ${action}`, {
            ...activityDetails,
            error: {
              message: error.message,
              statusCode: error.status || 500
            }
          });
        }
      })
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return {};
    
    try {
      // Create a deep copy
      const sanitized = JSON.parse(JSON.stringify(body));
      
      // List of sensitive fields to remove
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'jwt'];
      
      // Recursive function to sanitize data
      const sanitizeObject = (obj: any) => {
        if (typeof obj !== 'object' || obj === null) return;
        
        Object.keys(obj).forEach(key => {
          if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object') {
            sanitizeObject(obj[key]);
          }
        });
      };
      
      sanitizeObject(sanitized);
      return sanitized;
    } catch (error) {
      return { sanitizationError: true };
    }
  }
} 