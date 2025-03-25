import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { DonorQueriesService } from './donor-queries.service';
import { CreateDonorQueryDto } from './dto/create-donor-query.dto';
import { UpdateDonorQueryDto } from './dto/update-donor-query.dto';
import { FilterDonorQueriesDto } from './dto/filter-donor-queries.dto';
import { QueryStatus, User, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { GetUser } from '../auth/get-user.decorator';
import { LogActivity } from '../logging/decorators/log-activity.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller({
  path: 'donor-queries',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class DonorQueriesController {
  constructor(private readonly donorQueriesService: DonorQueriesService) {}

  @Post()
  @Public()
  @LogActivity('Created a new donor query')
  async create(@Body() createDonorQueryDto: CreateDonorQueryDto) {
    try {
      const query = await this.donorQueriesService.create(createDonorQueryDto);
      return {
        status: HttpStatus.CREATED,
        data: query,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: error.message || 'Failed to create query',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @LogActivity('Viewed all donor queries')
  async findAll() {
    const queries = await this.donorQueriesService.findAll();
    return {
      status: HttpStatus.OK,
      data: queries,
    };
  }

  @Get('general')
  @Public()
  async findGeneral(@Query() filterDto: FilterDonorQueriesDto) {
    try {
      // Get queries with both IN_PROGRESS and PENDING_REPLY statuses
      const statuses = [QueryStatus.IN_PROGRESS, QueryStatus.PENDING_REPLY];
      const queries =
        await this.donorQueriesService.findManyByStatusesWithFilters(
          statuses,
          filterDto,
        );

      return {
        status: HttpStatus.OK,
        data: queries,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: error.message || 'Failed to fetch general queries',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('status/:status')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findAllByStatus(@Param('status') status: QueryStatus) {
    const queries = await this.donorQueriesService.findAllByStatus(status);
    return {
      status: HttpStatus.OK,
      data: queries,
    };
  }

  @Get('resolved')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findResolved(@Query() filterDto: FilterDonorQueriesDto) {
    try {
      const queries =
        await this.donorQueriesService.findManyByStatusesWithFilters(
          [QueryStatus.RESOLVED],
          filterDto,
        );
      return {
        status: HttpStatus.OK,
        data: queries,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: error.message || 'Failed to fetch resolved queries',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('transferred')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findTransferred(@Query() filterDto: FilterDonorQueriesDto) {
    try {
      const queries =
        await this.donorQueriesService.findManyByStatusesWithFilters(
          [QueryStatus.TRANSFERRED],
          filterDto,
        );
      return {
        status: HttpStatus.OK,
        data: queries,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: error.message || 'Failed to fetch transferred queries',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('in-progress')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findInProgress(@Query() filterDto: FilterDonorQueriesDto) {
    try {
      const queries =
        await this.donorQueriesService.findManyByStatusesWithFilters(
          [QueryStatus.IN_PROGRESS],
          filterDto,
        );
      return {
        status: HttpStatus.OK,
        data: queries,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: error.message || 'Failed to fetch in-progress queries',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('pending-reply')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findPendingReply(@Query() filterDto: FilterDonorQueriesDto) {
    try {
      const queries =
        await this.donorQueriesService.findManyByStatusesWithFilters(
          [QueryStatus.PENDING_REPLY],
          filterDto,
        );
      return {
        status: HttpStatus.OK,
        data: queries,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: error.message || 'Failed to fetch pending-reply queries',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('user')
  @Public()
  async findByDonorIdQuery(@Query('donorId') donorId: string) {
    if (!donorId) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'donorId query parameter is required',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const queries = await this.donorQueriesService.findByDonorId(donorId);
    return queries;
  }

  @Get('user/:email')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findByUserEmail(@Param('email') email: string) {
    const queries = await this.donorQueriesService.findByUserEmail(email);
    return {
      status: HttpStatus.OK,
      data: queries,
    };
  }

  @Get('donor/:donorId')
  @Public()
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findByDonorId(@Param('donorId') donorId: string) {
    const queries = await this.donorQueriesService.findByDonorId(donorId);
    return {
      status: HttpStatus.OK,
      data: queries,
    };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const query = await this.donorQueriesService.findOne(id);
    return {
      status: HttpStatus.OK,
      data: query,
    };
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @LogActivity('Updated a donor query')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDonorQueryDto: UpdateDonorQueryDto,
  ) {
    const query = await this.donorQueriesService.update(
      id,
      updateDonorQueryDto,
    );
    return {
      status: HttpStatus.OK,
      data: query,
    };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @LogActivity('Deleted a donor query')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const result = await this.donorQueriesService.remove(id);
    return {
      status: HttpStatus.OK,
      data: result,
    };
  }

  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @LogActivity('Resolved a donor query')
  async resolveQuery(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const adminId = req.user?.id || req.user?.userId || req.userId;

    const query = await this.donorQueriesService.resolveQuery(id, adminId);
    return {
      status: HttpStatus.OK,
      data: query,
    };
  }

  @Post(':id/pending-reply')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @LogActivity('Marked a donor query as pending reply')
  async setPendingReply(@Param('id', ParseIntPipe) id: number) {
    const query = await this.donorQueriesService.setPendingReply(id);
    return {
      status: HttpStatus.OK,
      data: query,
    };
  }

  @Post(':id/in-progress')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @LogActivity('Marked a donor query as in progress')
  async setInProgress(@Param('id', ParseIntPipe) id: number) {
    const query = await this.donorQueriesService.setInProgress(id);
    return {
      status: HttpStatus.OK,
      data: query,
    };
  }

  @Patch(':id/transfer')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @LogActivity('Transferred a donor query to another admin')
  async transferQuery(
    @Param('id', ParseIntPipe) id: number,
    @Body('adminId') adminId: number,
    @Body('transferredTo') transferredTo: string,
    @Body('transferNote') transferNote?: string,
  ) {
    try {
      // Check if adminId is provided (may be named adminId in the request body)
      const transferredToUserId = adminId;
      
      if (!transferredToUserId || isNaN(transferredToUserId)) {
        throw new HttpException(
          'Invalid adminId: a valid admin ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      
      // If transferredTo is not provided, use a default placeholder
      const targetName = transferredTo || 'another admin';
      
      const query = await this.donorQueriesService.transferQuery(
        id,
        transferredToUserId,
        targetName,
        transferNote,
      );
      
      return {
        status: HttpStatus.OK,
        data: query,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to transfer query',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/accept')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @LogActivity('Accepted a donor query assignment')
  async acceptQuery(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    try {
      // Extract userId from the request
      const userId = req.user?.id || req.user?.userId;

      if (!userId) {
        throw new HttpException(
          'User ID not found in the request',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.donorQueriesService.acceptQuery(id, userId);
      return {
        status: HttpStatus.OK,
        data: result,
        message: 'Query accepted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: error.message || 'Failed to accept query',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/send-reminder')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @LogActivity('Sent a reminder for a donor query')
  async sendReminder(
    @Param('id', ParseIntPipe) id: number,
    @Body('message') message?: string,
  ) {
    const query = await this.donorQueriesService.sendReminder(id, message);
    return {
      status: HttpStatus.OK,
      data: query,
      message: 'Reminder sent successfully',
    };
  }

  @Get('filtered/statuses')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findManyByStatuses(
    @Query('statuses') statuses: QueryStatus[],
    @Query() filterDto: FilterDonorQueriesDto,
  ) {
    const queries =
      await this.donorQueriesService.findManyByStatusesWithFilters(
        statuses,
        filterDto,
      );
    return {
      status: HttpStatus.OK,
      data: queries,
    };
  }

  @Post(':id/donor-close')
  @Public()
  @LogActivity('Donor closed their query')
  async donorCloseQuery(
    @Param('id', ParseIntPipe) id: number,
    @Body('donorId') donorId: string,
  ) {
    try {
      if (!donorId) {
        throw new HttpException('Donor ID is required', HttpStatus.BAD_REQUEST);
      }

      const query = await this.donorQueriesService.donorCloseQuery(id, donorId);
      return {
        status: HttpStatus.OK,
        data: query,
        message: 'Query closed successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: error.message || 'Failed to close query',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/is-accepted')
  @Public()
  async isQueryAccepted(@Param('id', ParseIntPipe) id: number) {
    try {
      const query = await this.donorQueriesService.findOne(id);
      const isAccepted = query.status === 'IN_PROGRESS' && query.assignedToId !== null;
      
      return {
        status: HttpStatus.OK,
        data: {
          isAccepted,
          assignedToUser: isAccepted ? query.assignedToUser : null,
          status: query.status
        }
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to check query acceptance status',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
