import { Controller, Get, Header, Res } from '@nestjs/common';
import { Public } from './auth/public.decorator';
import { Response } from 'express';

@Controller()
export class AppController {
  @Get()
  @Public()
  @Header('Content-Type', 'text/html')
  getRoot(@Res({ passthrough: true }) res: Response): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proof Concierge API</title>
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
          code {
            background-color: #f8f9fa;
            padding: 2px 5px;
            border-radius: 4px;
            font-family: monospace;
          }
          .version {
            color: #7f8c8d;
            font-size: 0.9em;
          }
          .status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
            background-color: #2ecc71;
            color: white;
          }
        </style>
      </head>
      <body>
        <h1>Proof Concierge API</h1>
        <p class="status">Running</p>
        <p>Welcome to the Proof Concierge API. This backend service powers the Proof Concierge support ticket management system.</p>
        
        <h2>API Documentation</h2>
        <p>The API provides endpoints for managing donor queries, messages, and call sessions.</p>
        <ul>
          <li>Donor queries (support tickets)</li>
          <li>Real-time messaging</li>
          <li>Video/audio calling integration</li>
          <li>Admin management tools</li>
        </ul>
        
        <h2>Health Check</h2>
        <p>You can verify the system status by visiting the following endpoints:</p>
        <ul>
          <li><code>/health</code> - Basic health check</li>
          <li><code>/health/ping</code> - Simple ping endpoint</li>
          <li><code>/health/advanced</code> - Detailed system information</li>
        </ul>
        
        <h2>API Versioning</h2>
        <p>All API endpoints are versioned using the format: <code>/api/v1/...</code></p>
        
        <footer>
          <p class="version">Proof Concierge Backend v1.0</p>
        </footer>
      </body>
      </html>
    `;
  }
} 