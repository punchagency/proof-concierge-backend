import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, HttpStatus, HttpException, ParseIntPipe, Request } from '@nestjs/common';
import { DonorQueriesService } from './donor-queries.service';
import { CreateDonorQueryDto } from './dto/create-donor-query.dto';
import { UpdateDonorQueryDto } from './dto/update-donor-query.dto';
import { FilterDonorQueriesDto } from './dto/filter-donor-queries.dto';
import { QueryStatus, User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { GetUser } from '../auth/get-user.decorator';

@Controller({
  path: 'donor-queries',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class DonorQueriesController {
  constructor(private readonly donorQueriesService: DonorQueriesService) {}

  @Post()
  @Public()
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
      const queries = await this.donorQueriesService.findManyByStatusesWithFilters(statuses, filterDto);
      
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
      const queries = await this.donorQueriesService.findManyByStatusesWithFilters([QueryStatus.RESOLVED], filterDto);
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
      const queries = await this.donorQueriesService.findManyByStatusesWithFilters([QueryStatus.TRANSFERRED], filterDto);
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
      const queries = await this.donorQueriesService.findManyByStatusesWithFilters([QueryStatus.IN_PROGRESS], filterDto);
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
      const queries = await this.donorQueriesService.findManyByStatusesWithFilters([QueryStatus.PENDING_REPLY], filterDto);
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
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDonorQueryDto: UpdateDonorQueryDto) {
    const query = await this.donorQueriesService.update(id, updateDonorQueryDto);
    return {
      status: HttpStatus.OK,
      data: query,
    };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const result = await this.donorQueriesService.remove(id);
    return {
      status: HttpStatus.OK,
      data: result,
    };
  }

  @Post(':id/resolve')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async resolveQuery(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    const query = await this.donorQueriesService.resolveQuery(id, user.id);
    return {
      status: HttpStatus.OK,
      data: query,
    };
  }

  @Post(':id/pending-reply')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async setPendingReply(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const query = await this.donorQueriesService.setPendingReply(id);
    return {
      status: HttpStatus.OK,
      data: query,
    };
  }

  @Post(':id/in-progress')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async setInProgress(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const query = await this.donorQueriesService.setInProgress(id);
    return {
      status: HttpStatus.OK,
      data: query,
    };
  }

  @Post(':id/transfer')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async transferQuery(
    @Param('id', ParseIntPipe) id: number,
    @Body('transferredToUserId') transferredToUserId: number,
    @Body('transferredTo') transferredTo: string,
    @Body('transferNote') transferNote?: string,
  ) {
    const query = await this.donorQueriesService.transferQuery(id, transferredToUserId, transferredTo, transferNote);
    return {
      status: HttpStatus.OK,
      data: query,
    };
  }

  @Patch(':id/accept')
  @Roles('SUPER_ADMIN', 'ADMIN')
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
    const queries = await this.donorQueriesService.findManyByStatusesWithFilters(statuses, filterDto);
    return {
      status: HttpStatus.OK,
      data: queries,
    };
  }

  @Post(':id/donor-close')
  @Public()
  async donorCloseQuery(
    @Param('id', ParseIntPipe) id: number,
    @Body('donorId') donorId: string,
  ) {
    try {
      if (!donorId) {
        throw new HttpException(
          'Donor ID is required',
          HttpStatus.BAD_REQUEST,
        );
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
}