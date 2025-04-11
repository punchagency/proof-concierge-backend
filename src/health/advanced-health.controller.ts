import { Controller, Get, Header, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { Response } from 'express';

@Controller('health/advanced')
export class AdvancedHealthController {
  constructor(
    private healthService: HealthService,
    private configService: ConfigService,
  ) {}

  private getOverallStatus(statuses: string[]): string {
    if (statuses.some(status => status === 'down')) {
      return 'error';
    }
    if (statuses.some(status => status === 'warning')) {
      return 'warning';
    }
    return 'ok';
  }

  @Get()
  @Public()
  @Header('Content-Type', 'text/html')
  @ApiOperation({ summary: 'Get advanced health check information' })
  async check(@Res({ passthrough: true }) res: Response) {
    const [
      database,
      storage,
      memory,
      frontend,
      donorQueries,
      emailService,
    ] = await Promise.all([
      this.healthService.checkDatabase(),
      this.healthService.checkDiskStorage(),
      this.healthService.checkMemory(),
      this.healthService.checkExternalService(this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000', 2000),
      this.healthService.checkDonorQueriesHealth(),
      this.healthService.checkEmailService(),
    ]);

    // Create a modified frontend result that uses warning instead of down
    const frontendResult = {
      ...frontend,
      status: frontend.status === 'down' ? 'warning' : frontend.status
    };

    const statusList = [
      database.status,
      storage.status,
      memory.heap.status,
      memory.rss.status,
      frontendResult.status,
      donorQueries.status,
      emailService.status,
    ];

    const overallStatus = this.getOverallStatus(statusList);

    // JSON response for API consumers
    const jsonResponse = {
      status: overallStatus,
      info: {
        database: { status: database.status },
        storage: { status: storage.status },
        memory_heap: { status: memory.heap.status },
        memory_rss: { status: memory.rss.status },
        frontend: { status: frontendResult.status },
        donor_queries: { status: donorQueries.status },
        email_service: { status: emailService.status },
      },
      error: {},
      details: {
        database,
        storage,
        memory_heap: memory.heap,
        memory_rss: memory.rss,
        frontend: frontendResult,
        donor_queries: donorQueries,
        email_service: emailService,
      },
    };

    // Check Accept header for application/json
    const acceptHeader = res.req.headers.accept || '';
    if (acceptHeader.includes('application/json')) {
      res.header('Content-Type', 'application/json');
      return jsonResponse;
    }

    // Generate visual status indicators
    const getStatusBadge = (status: string) => {
      const color = status === 'up' ? '#2ecc71' : status === 'warning' ? '#f39c12' : '#e74c3c';
      return `<span class="status-badge" style="background-color: ${color};">${status}</span>`;
    };

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proof Concierge - Advanced Health</title>
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
          .status-warning {
            background-color: #f39c12;
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
          .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 15px;
            margin-top: 20px;
          }
          .dashboard-item {
            border-radius: 8px;
            padding: 15px;
            background-color: #f8f9fa;
            text-align: center;
            position: relative;
          }
          .dashboard-item h3 {
            margin-top: 0;
            font-size: 16px;
          }
          .indicator {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            position: absolute;
            top: 15px;
            right: 15px;
          }
          .indicator-up {
            background-color: #2ecc71;
          }
          .indicator-warning {
            background-color: #f39c12;
          }
          .indicator-down {
            background-color: #e74c3c;
          }
          .timestamp {
            color: #7f8c8d;
            font-size: 0.9em;
            margin-top: 40px;
          }
          .details-section {
            margin-top: 40px;
          }
        </style>
      </head>
      <body>
        <h1>Advanced System Health</h1>
        <div class="status-overall status-${overallStatus}">${overallStatus.toUpperCase()}</div>
        
        <h2>Status Overview</h2>
        <div class="dashboard">
          <div class="dashboard-item">
            <div class="indicator indicator-${database.status}"></div>
            <h3>Database</h3>
            <p>${database.status.toUpperCase()}</p>
          </div>
          
          <div class="dashboard-item">
            <div class="indicator indicator-${storage.status}"></div>
            <h3>Storage</h3>
            <p>${storage.status.toUpperCase()}</p>
            ${storage.used && storage.total ? `<p>${Math.round((storage.used / storage.total) * 100)}% used</p>` : ''}
          </div>
          
          <div class="dashboard-item">
            <div class="indicator indicator-${memory.heap.status}"></div>
            <h3>Memory (Heap)</h3>
            <p>${memory.heap.status.toUpperCase()}</p>
            ${memory.heap.used ? `<p>${Math.round(memory.heap.used / 1024 / 1024)}MB used</p>` : ''}
          </div>
          
          <div class="dashboard-item">
            <div class="indicator indicator-${memory.rss.status}"></div>
            <h3>Memory (RSS)</h3>
            <p>${memory.rss.status.toUpperCase()}</p>
            ${memory.rss.used ? `<p>${Math.round(memory.rss.used / 1024 / 1024)}MB used</p>` : ''}
          </div>
          
          <div class="dashboard-item">
            <div class="indicator indicator-${frontendResult.status}"></div>
            <h3>Frontend</h3>
            <p>${frontendResult.status.toUpperCase()}</p>
          </div>
          
          <div class="dashboard-item">
            <div class="indicator indicator-${donorQueries.status}"></div>
            <h3>Donor Queries</h3>
            <p>${donorQueries.queryCount ?? 'Unknown'} queries</p>
          </div>
          
          <div class="dashboard-item">
            <div class="indicator indicator-${emailService.status}"></div>
            <h3>Email Service</h3>
            <p>${emailService.message ? emailService.message.split(':')[0] : 'SendGrid'}</p>
          </div>
        </div>
        
        <div class="details-section">
          <h2>Component Details</h2>
          
          <div class="component">
            <h3>Database ${getStatusBadge(database.status)}</h3>
            <p>${database.message || 'Database connection is functioning properly.'}</p>
            ${database.responseTime ? `<p>Response time: ${database.responseTime}ms</p>` : ''}
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
            <h3>Frontend ${getStatusBadge(frontendResult.status)}</h3>
            <p>${frontendResult.message || 'Frontend connectivity check completed.'}</p>
            ${frontendResult.responseTime ? `<p>Response time: ${frontendResult.responseTime}ms</p>` : ''}
          </div>
          
          <div class="component">
            <h3>Donor Queries ${getStatusBadge(donorQueries.status)}</h3>
            <p>${donorQueries.message || 'Donor queries health check passed.'}</p>
            ${donorQueries.queryCount !== undefined ? `<p>Total Queries: ${donorQueries.queryCount}</p>` : ''}
            ${donorQueries.mostRecentQueryDate ? `<p>Most recent query: ${new Date(donorQueries.mostRecentQueryDate).toLocaleString()}</p>` : ''}
          </div>
          
          <div class="component">
            <h3>Email Service ${getStatusBadge(emailService.status)}</h3>
            <p>${emailService.message || 'Email service is functioning properly.'}</p>
          </div>
        </div>
        
        <h2>Related Endpoints</h2>
        <ul>
          <li><a href="/health">/health</a> - Basic health check</li>
          <li><a href="/health/ping">/health/ping</a> - Simple ping endpoint</li>
          <li><a href="/health/advanced/detailed">/health/advanced/detailed</a> - Detailed system information</li>
          <li><a href="/">/</a> - Return to homepage</li>
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

  @Get('detailed')
  @Public()
  @Header('Content-Type', 'text/html')
  detailedCheck(@Res({ passthrough: true }) res: Response) {
    const systemInfo = this.healthService.getSystemInfo();
    
    // Check Accept header for application/json
    const acceptHeader = res.req.headers.accept || '';
    if (acceptHeader.includes('application/json')) {
      res.header('Content-Type', 'application/json');
      return systemInfo;
    }
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proof Concierge - System Information</title>
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
          .info-card {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 5px solid #3498db;
          }
          .info-card h3 {
            margin-top: 0;
            color: #3498db;
          }
          pre {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
          }
          code {
            font-family: monospace;
          }
          ul {
            padding-left: 20px;
          }
          li {
            margin-bottom: 8px;
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
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          th, td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
          }
          th {
            background-color: #f1f3f5;
            font-weight: bold;
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
        </style>
      </head>
      <body>
        <h1>System Information</h1>
        
        <div class="info-card">
          <h3>Environment</h3>
          <table>
            <tr>
              <th>Node.js Version</th>
              <td>${systemInfo.versions.node}</td>
            </tr>
            <tr>
              <th>Environment</th>
              <td>${systemInfo.environment}</td>
            </tr>
            <tr>
              <th>Uptime</th>
              <td>${Math.floor(systemInfo.uptime / 3600)} hours, ${Math.floor((systemInfo.uptime % 3600) / 60)} minutes</td>
            </tr>
            <tr>
              <th>Timestamp</th>
              <td>${systemInfo.timestamp}</td>
            </tr>
          </table>
        </div>
        
        <div class="info-card">
          <h3>Memory Usage</h3>
          <table>
            <tr>
              <th>Heap Used</th>
              <td>${Math.round(systemInfo.memory.heapUsed / 1024 / 1024)} MB</td>
            </tr>
            <tr>
              <th>Heap Total</th>
              <td>${Math.round(systemInfo.memory.heapTotal / 1024 / 1024)} MB</td>
            </tr>
            <tr>
              <th>RSS</th>
              <td>${Math.round(systemInfo.memory.rss / 1024 / 1024)} MB</td>
            </tr>
            <tr>
              <th>External</th>
              <td>${Math.round((systemInfo.memory.external || 0) / 1024 / 1024)} MB</td>
            </tr>
          </table>
        </div>
        
        <div class="info-card">
          <h3>Operating System</h3>
          <table>
            <tr>
              <th>Platform</th>
              <td>${systemInfo.os.platform}</td>
            </tr>
            <tr>
              <th>Type</th>
              <td>${systemInfo.os.type}</td>
            </tr>
            <tr>
              <th>Release</th>
              <td>${systemInfo.os.release}</td>
            </tr>
            <tr>
              <th>Total Memory</th>
              <td>${Math.round(systemInfo.os.totalMemory / 1024 / 1024 / 1024)} GB</td>
            </tr>
            <tr>
              <th>Free Memory</th>
              <td>${Math.round(systemInfo.os.freeMemory / 1024 / 1024 / 1024)} GB</td>
            </tr>
            <tr>
              <th>CPU Cores</th>
              <td>${systemInfo.os.cpus ? systemInfo.os.cpus.length : 'Unknown'}</td>
            </tr>
            <tr>
              <th>Load Average</th>
              <td>${systemInfo.os.loadAvg ? systemInfo.os.loadAvg.map(load => load.toFixed(2)).join(', ') : 'Unknown'}</td>
            </tr>
          </table>
        </div>
        
        <div class="info-card">
          <h3>Dependencies</h3>
          <table>
            <tr>
              <th>NestJS</th>
              <td>${systemInfo.versions.dependencies?.nestjs || 'Unknown'}</td>
            </tr>
            <tr>
              <th>TypeScript</th>
              <td>${systemInfo.versions.dependencies?.typescript || 'Unknown'}</td>
            </tr>
          </table>
        </div>
        
        <h2>Related Endpoints</h2>
        <ul>
          <li><a href="/health">/health</a> - Basic health check</li>
          <li><a href="/health/ping">/health/ping</a> - Simple ping endpoint</li>
          <li><a href="/health/advanced">/health/advanced</a> - Advanced health check</li>
          <li><a href="/">/</a> - Return to homepage</li>
        </ul>
        
        <button class="json-toggle" onclick="document.getElementById('json-view').style.display = document.getElementById('json-view').style.display === 'none' ? 'block' : 'none'">
          Show/Hide JSON Response
        </button>
        
        <div id="json-view" class="json-view">
          <h2>JSON Response</h2>
          <pre><code>${JSON.stringify(systemInfo, null, 2)}</code></pre>
        </div>
        
        <p class="timestamp">Last updated: ${new Date().toISOString()}</p>
      </body>
      </html>
    `;
  }
} 