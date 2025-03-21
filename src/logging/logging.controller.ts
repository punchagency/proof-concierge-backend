import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import { LoggingService } from './logging.service';
import { Public } from '../auth/public.decorator';
import { LogActivity } from './decorators/log-activity.decorator';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const execPromise = promisify(exec);

@Controller('api/v1/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class LoggingController {
  constructor(private readonly loggingService: LoggingService) {
    this.loggingService.setContext('LoggingController');
  }

  @Get()
  @LogActivity('Viewed available log files')
  async getAvailableLogs() {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      
      // Create logs directory if it doesn't exist
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
        return { logFiles: [] };
      }
      
      const files = await readdir(logDir);
      
      const logFiles = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(logDir, file);
          const fileStat = await stat(filePath);
          return {
            name: file,
            size: fileStat.size,
            sizeFormatted: this.formatBytes(fileStat.size),
            created: fileStat.birthtime,
            modified: fileStat.mtime,
          };
        })
      );
      
      // Sort by modification date (newest first)
      logFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
      
      return { logFiles };
    } catch (error) {
      this.loggingService.error(`Failed to get log files: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  @Get(':filename')
  @LogActivity('Viewed log file content')
  async getLogFile(
    @Param('filename') filename: string, 
    @Query('lines') lines: number = 100,
    @Query('page') page: number = 1,
    @Query('search') search?: string
  ) {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      const filePath = path.join(logDir, filename);
      
      // Ensure the file exists and is within the logs directory
      if (!fs.existsSync(filePath) || !filePath.startsWith(logDir)) {
        throw new Error('Log file not found');
      }
      
      // If search term is provided, use grep to find matching lines
      if (search) {
        const { stdout } = await execPromise(`grep -i "${search}" ${filePath} | tail -n ${lines}`);
        const content = stdout.split('\n').filter(line => line.trim());
        
        return { 
          filename,
          searchTerm: search,
          lines: content.length,
          content
        };
      }
      
      // For pagination, calculate offsets
      const startLine = (page - 1) * lines + 1;
      
      // Get total line count
      const { stdout: wcOutput } = await execPromise(`wc -l ${filePath}`);
      const totalLines = parseInt(wcOutput.trim().split(' ')[0], 10);
      
      // Get the lines for the requested page
      const { stdout } = await execPromise(`sed -n '${startLine},+${lines}p' ${filePath}`);
      const content = stdout.split('\n').filter(line => line.trim());
      
      return {
        filename,
        page,
        linesPerPage: lines,
        totalLines,
        totalPages: Math.ceil(totalLines / lines),
        content
      };
    } catch (error) {
      this.loggingService.error(`Failed to get log file ${filename}: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  @Get('search/:type')
  @LogActivity('Performed log search')
  async searchLogs(
    @Param('type') type: string,
    @Query('query') query: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit: number = 100,
    @Query('userId') userId?: number
  ) {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      let searchPattern = query || '';
      let filePattern: string;
      
      // Validate type parameter
      if (!['all', 'errors', 'user-activity', 'application'].includes(type)) {
        type = 'all';
      }
      
      // Determine file pattern based on log type
      switch (type) {
        case 'errors':
          filePattern = 'errors-*.log';
          break;
        case 'user-activity':
          filePattern = 'user-activity-*.log';
          break;
        case 'application':
          filePattern = 'application-*.log';
          break;
        default:
          filePattern = '*.log';
      }
      
      // Add user ID filter if provided (for user-activity logs)
      if (type === 'user-activity' && userId) {
        searchPattern = `"userId":${userId}${searchPattern ? ` ${searchPattern}` : ''}`;
      }
      
      // Build grep command with pattern and optional date range filtering
      let command = `grep -i "${searchPattern}" ${path.join(logDir, filePattern)}`;
      
      // Add date filtering if provided
      if (from || to) {
        const grepCommand = command;
        command = `${grepCommand} | awk '`;
        
        if (from) {
          const fromDate = new Date(from);
          command += `$0 ~ /"timestamp":"[^"]*"/ && $0 ~ /"timestamp":"[^"]*${fromDate.toISOString().substring(0, 10)}/ `;
        }
        
        if (to) {
          const toDate = new Date(to);
          if (from) command += ' && ';
          command += `$0 ~ /"timestamp":"[^"]*"/ && $0 ~ /"timestamp":"[^"]*${toDate.toISOString().substring(0, 10)}/ `;
        }
        
        command += `{ print $0 }'`;
      }
      
      // Limit the number of results
      command += ` | head -n ${limit}`;
      
      // Execute the search
      const { stdout } = await execPromise(command).catch(err => {
        // Handle the case where grep finds no matches (returns exit code 1)
        if (err.code === 1 && err.stdout === '') {
          return { stdout: '' };
        }
        throw err;
      });
      
      // Parse log entries
      const logs = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { raw: line };
          }
        });
      
      return { 
        searchType: type,
        searchPattern: searchPattern || undefined,
        fromDate: from || undefined,
        toDate: to || undefined,
        userId: userId || undefined,
        count: logs.length,
        limit,
        logs 
      };
    } catch (error) {
      this.loggingService.error(`Failed to search logs: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  @Get('stats/overview')
  @LogActivity('Viewed log statistics')
  async getLogStats() {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      
      // Create logs directory if it doesn't exist
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
        return { stats: { totalLogs: 0, errorCount: 0, userActivities: 0 } };
      }
      
      // Get error count
      const errorCount = await this.countLogEntries(path.join(logDir, 'errors-*.log'));
      
      // Get user activity count
      const userActivityCount = await this.countLogEntries(path.join(logDir, 'user-activity-*.log'));
      
      // Get total log count (all logs)
      const totalLogCount = await this.countLogEntries(path.join(logDir, '*.log'));
      
      // Get today's error count
      const today = new Date().toISOString().substring(0, 10);
      const todayErrorCount = await this.countLogEntries(
        path.join(logDir, `errors-${today}.log`)
      ).catch(() => 0);
      
      // Get space usage
      const { stdout: duOutput } = await execPromise(`du -sh ${logDir}`).catch(() => ({ stdout: '0' }));
      const spaceUsage = duOutput.trim().split('\t')[0];
      
      return {
        stats: {
          totalLogs: totalLogCount,
          errorCount,
          userActivities: userActivityCount,
          todayErrors: todayErrorCount,
          spaceUsage,
        }
      };
    } catch (error) {
      this.loggingService.error(`Failed to get log statistics: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  private async countLogEntries(filePattern: string): Promise<number> {
    try {
      const { stdout } = await execPromise(`wc -l ${filePattern}`).catch(() => ({ stdout: '0' }));
      return parseInt(stdout.trim().split(' ')[0], 10);
    } catch {
      return 0;
    }
  }
  
  private formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
} 