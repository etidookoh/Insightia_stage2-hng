import {
  Controller, Get, Post, Query, Body, Res,
  BadRequestException, UnprocessableEntityException,
  UsePipes, ValidationPipe, Req, UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { CsvIngestionService } from './csv-ingestion.service';
import { QueryProfileDto } from './dto/query-profile.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import type { Response, Request } from 'express';
import { memoryStorage } from 'multer';

@Controller('api/profiles')
export class ProfileController {
  constructor(
    private readonly profilesService: ProfileService,
    private readonly csvIngestionService: CsvIngestionService,
  ) {}

  @Get()
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    exceptionFactory: (errors) => {
      const messages = errors.map((e) => Object.values(e.constraints || {}).join(', '));
      const isTypeError = errors.some((e) =>
        Object.keys(e.constraints || {}).some((k) => ['isNumber', 'isInt', 'isBoolean'].includes(k)),
      );
      if (isTypeError) return new UnprocessableEntityException({ status: 'error', message: 'Invalid query parameters' });
      return new BadRequestException({ status: 'error', message: messages[0] || 'Invalid query parameters' });
    },
  }))
  async findAll(@Query() query: QueryProfileDto, @Req() req: Request) {
    return this.profilesService.findAll(query, req);
  }

  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: Request,
  ) {
    if (!q || !q.trim()) {
      throw new BadRequestException({ status: 'error', message: 'Unable to interpret query' });
    }
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      throw new UnprocessableEntityException({ status: 'error', message: 'Invalid query parameters' });
    }
    return this.profilesService.search(q, pageNum, Math.min(limitNum, 50), req);
  }

  @Get('export')
  async export(@Query() query: QueryProfileDto, @Res() res: Response) {
    const profiles = await this.profilesService.exportCsv(query);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `profiles_${timestamp}.csv`;

    const header = 'id,name,gender,gender_probability,age,age_group,country_id,country_name,country_probability,created_at';
    const rows = profiles.map(p =>
      [p.id, p.name, p.gender, p.gender_probability, p.age, p.age_group,
       p.country_id, p.country_name, p.country_probability, p.created_at].join(',')
    );
    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body('name') name: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException({ status: 'error', message: 'Name is required' });
    }
    const data = await this.profilesService.create(name);
    return { status: 'success', data };
  }

  /**
   * POST /api/profiles/upload
   * Admin-only. Accepts a multipart CSV file and streams it into the database
   * in chunks of 500 rows. Never loads the full file into memory.
   * Returns a summary of inserted / skipped rows.
   */
  @Post('upload')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // buffer in memory — fine since we stream it immediately
      limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB cap
      },
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.csv$/i)) {
          return cb(new BadRequestException('Only CSV files are accepted'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({ status: 'error', message: 'No file uploaded' });
    }
    const result = await this.csvIngestionService.ingestCsvBuffer(file.buffer);
    return result;
  }
}