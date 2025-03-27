import { Controller, Get, Header, Res } from '@nestjs/common';
import { HealthService } from './health.service';
import { Response } from 'express';
import { Public } from '../auth/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private healthService: HealthService,
  ) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/html')
  async check(@Res({ passthrough: true }) res: Response) {
    const database = await this.healthService.checkDatabase();
    const storage = await this.healthService.checkDiskStorage();
    const memory = await this.healthService.checkMemory();
    const emailService = await this.healthService.checkEmailService();

    const status = 
      database.status === 'up' && 
      storage.status === 'up' && 
      memory.heap.status === 'up' && 
      memory.rss.status === 'up' &&
      (emailService.status === 'up' || emailService.status === 'warning') ? 'ok' : 'error';
    
    // Also prepare JSON response for potential API consumers
    const jsonResponse = {
      status,
      info: {
        database: {
          status: database.status
        },
        storage: {
          status: storage.status
        },
        memory_heap: {
          status: memory.heap.status
        },
        memory_rss: {
          status: memory.rss.status
        },
        email_service: {
          status: emailService.status
        }
      },
      error: {},
      details: {
        database,
        storage,
        memory_heap: memory.heap,
        memory_rss: memory.rss,
        email_service: emailService
      }
    };

    // Check Accept header for application/json
    const acceptHeader = res.req.headers.accept || '';
    if (acceptHeader.includes('application/json')) {
      res.header('Content-Type', 'application/json');
      return jsonResponse;
    }

    // Generate visual status indicators
    const getStatusBadge = (status: string) => {
      const color = status === 'up' ? '#2ecc71' : '#e74c3c';
      return `<span class="status-badge" style="background-color: ${color};">${status}</span>`;
    };

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proof Concierge - Health Status</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
          }
          h2 {
            color: #3498db;
            margin-top: 30px;
          }
          ul {
            padding-left: 20px;
          }
          li {
            margin-bottom: 8px;
          }
          pre {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
          }
          code {
            background-color: #f8f9fa;
            padding: 2px 5px;
            border-radius: 4px;
            font-family: monospace;
          }
          .status-overall {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: bold;
            color: white;
            margin-bottom: 20px;
            font-size: 18px;
          }
          .status-ok {
            background-color: #2ecc71;
          }
          .status-error {
            background-color: #e74c3c;
          }
          .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: bold;
            color: white;
            text-transform: uppercase;
            font-size: 12px;
          }
          .component {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 5px solid #3498db;
          }
          .component h3 {
            margin-top: 0;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .json-view {
            margin-top: 30px;
            display: none;
          }
          .json-toggle {
            margin-top: 20px;
            background-color: #f8f9fa;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          .json-toggle:hover {
            background-color: #e9ecef;
          }
          a {
            color: #3498db;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .timestamp {
            color: #7f8c8d;
            font-size: 0.9em;
            margin-top: 40px;
          }
        </style>
      </head>
      <body>
        <h1>System Health Status</h1>
        <div class="status-overall status-${status}">${status.toUpperCase()}</div>
        
        <h2>Component Status</h2>
        <div class="component">
          <h3>Database ${getStatusBadge(database.status)}</h3>
          <p>${database.message || 'Database connection is functioning properly.'}</p>
        </div>
        
        <div class="component">
          <h3>Storage ${getStatusBadge(storage.status)}</h3>
          <p>${storage.message || 'Storage check passed.'}</p>
          ${storage.available ? `<p>Available: ${Math.round(storage.available / 1024 / 1024 / 1024)}GB</p>` : ''}
          ${storage.total ? `<p>Total: ${Math.round(storage.total / 1024 / 1024 / 1024)}GB</p>` : ''}
          ${storage.used && storage.total ? `<p>Usage: ${Math.round((storage.used / storage.total) * 100)}%</p>` : ''}
        </div>
        
        <div class="component">
          <h3>Memory (Heap) ${getStatusBadge(memory.heap.status)}</h3>
          <p>${memory.heap.message || 'Memory heap check passed.'}</p>
          ${memory.heap.used ? `<p>Used: ${Math.round(memory.heap.used / 1024 / 1024)}MB</p>` : ''}
          ${memory.heap.total ? `<p>Total: ${Math.round(memory.heap.total / 1024 / 1024)}MB</p>` : ''}
        </div>
        
        <div class="component">
          <h3>Memory (RSS) ${getStatusBadge(memory.rss.status)}</h3>
          <p>${memory.rss.message || 'Memory RSS check passed.'}</p>
          ${memory.rss.used ? `<p>Used: ${Math.round(memory.rss.used / 1024 / 1024)}MB</p>` : ''}
          ${memory.rss.total ? `<p>Total: ${Math.round(memory.rss.total / 1024 / 1024)}MB</p>` : ''}
        </div>
        
        <div class="component">
          <h3>Email Service ${getStatusBadge(emailService.status)}</h3>
          <p>${emailService.message || 'Email service is functioning properly.'}</p>
        </div>
        
        <h2>Additional Health Endpoints</h2>
        <ul>
          <li><a href="/health/ping">/health/ping</a> - Simple ping endpoint</li>
          <li><a href="/health/advanced">/health/advanced</a> - Advanced health check</li>
          <li><a href="/health/advanced/detailed">/health/advanced/detailed</a> - Detailed system information</li>
        </ul>
        
        <button class="json-toggle" onclick="document.getElementById('json-view').style.display = document.getElementById('json-view').style.display === 'none' ? 'block' : 'none'">
          Show/Hide JSON Response
        </button>
        
        <div id="json-view" class="json-view">
          <h2>JSON Response</h2>
          <pre><code>${JSON.stringify(jsonResponse, null, 2)}</code></pre>
        </div>
        
        <p class="timestamp">Last updated: ${new Date().toISOString()}</p>
        
        <script>
          // Automatically refresh the page every 30 seconds
          setTimeout(() => {
            window.location.reload();
          }, 30000);
        </script>
      </body>
      </html>
    `;
  }

  @Get('ping')
  @Public()
  ping() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
} 