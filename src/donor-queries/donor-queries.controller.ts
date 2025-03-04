import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpStatus, Query, HttpException, Request, ParseIntPipe } from '@nestjs/common';
import { DonorQueriesService } from './donor-queries.service';
import { CreateDonorQueryDto } from './dto/create-donor-query.dto';
import { UpdateDonorQueryDto } from './dto/update-donor-query.dto';
import { QueryStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FilterDonorQueriesDto } from './dto/filter-donor-queries.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

@Controller({
  path: 'donor-queries',
  version: '1'
})
@UseGuards(JwtAuthGuard)
export class DonorQueriesController {
  constructor(private readonly donorQueriesService: DonorQueriesService) {}

  @Post()
  async create(@Body() createDonorQueryDto: CreateDonorQueryDto) {
    const query = await this.donorQueriesService.create(createDonorQueryDto);
    return {
      status: HttpStatus.CREATED,
      data: query,
    };
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findAll() {
    const queries = await this.donorQueriesService.findAll();
    return {
      status: HttpStatus.OK,
      data: queries,
    };
  }

  @Public()
  @Get('test-user')
  async getTestUserQueries() {
    // Get all queries that are in progress or pending reply
    const queries = await this.donorQueriesService.findManyByStatuses([
      QueryStatus.IN_PROGRESS,
      QueryStatus.PENDING_REPLY
    ]);
    return {
      status: HttpStatus.OK,
      data: queries,
    };
  }

  @Get('in-progress')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findInProgress(@Query() filterDto: FilterDonorQueriesDto) {
    const queries = await this.donorQueriesService.findAllByStatusWithFilters(
      QueryStatus.IN_PROGRESS, 
      filterDto
    );
    return {
      status: HttpStatus.OK,
      data: queries,
    };
  }

  @Get('pending-reply')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findPendingReply(@Query() filterDto: FilterDonorQueriesDto) {
    const queries = await this.donorQueriesService.findAllByStatusWithFilters(
      QueryStatus.PENDING_REPLY, 
      filterDto
    );
    return {
      status: HttpStatus.OK,
      data: queries,
    };
  }

  @Get('resolved')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findResolved(@Query() filterDto: FilterDonorQueriesDto) {
    const queries = await this.donorQueriesService.findAllByStatusWithFilters(
      QueryStatus.RESOLVED, 
      filterDto
    );
    return {
      status: HttpStatus.OK,
      data: queries,
    };
  }

  @Get('transferred')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findTransferred(@Query() filterDto: FilterDonorQueriesDto) {
    const queries = await this.donorQueriesService.findAllByStatusWithFilters(
      QueryStatus.TRANSFERRED, 
      filterDto
    );
    return {
      status: HttpStatus.OK,
      data: queries,
    };
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findOne(@Param('id') id: string) {
    const query = await this.donorQueriesService.findOne(+id);
    return {
      status: HttpStatus.OK,
      data: query,
    };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async update(@Param('id') id: string, @Body() updateDonorQueryDto: UpdateDonorQueryDto) {
    const query = await this.donorQueriesService.update(+id, updateDonorQueryDto);
    return {
      status: HttpStatus.OK,
      data: query,
    };
  }

  @Patch(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async resolve(@Param('id') id: string, @Body('resolvedById') resolvedById: number) {
    const query = await this.donorQueriesService.resolveQuery(+id, resolvedById);
    return {
      status: HttpStatus.OK,
      data: query,
    };
  }

  @Patch(':id/transfer')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async transfer(
    @Param('id') id: string, 
    @Body('transferredToUserId') transferredToUserId: number,
    @Body('transferNote') transferNote?: string
  ) {
    const query = await this.donorQueriesService.transferQuery(+id, transferredToUserId, transferNote);
    return {
      status: HttpStatus.OK,
      data: query,
    };
  }

  @Post(':id/send-reminder')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async sendReminder(
    @Param('id') id: string,
    @Body('message') message?: string
  ) {
    const query = await this.donorQueriesService.sendReminder(+id, message);
    return {
      status: HttpStatus.OK,
      data: query,
      message: 'Reminder sent successfully',
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  async remove(@Param('id') id: string) {
    const result = await this.donorQueriesService.remove(+id);
    return {
      status: HttpStatus.OK,
      data: result,
      message: `Query with ID ${id} has been removed`,
    };
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard)
  async acceptQuery(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.donorQueriesService.acceptQuery(id, userId);
      return {
        success: true,
        message: 'Query accepted successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to accept query',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}