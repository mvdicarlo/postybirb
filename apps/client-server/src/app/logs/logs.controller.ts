import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LogsService } from './logs.service';

/**
 * Controller for log file operations.
 * Provides an endpoint to download all logs as a .tar.gz archive.
 */
@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly service: LogsService) {}

  @Get('download')
  @ApiOkResponse({ description: 'Returns a .tar.gz archive of all log files.' })
  download(@Res() response) {
    const archive = this.service.getLogsArchive();
    const date = new Date().toISOString().split('T')[0];
    response.set({
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename=postybirb-logs-${date}.tar.gz`,
      'Content-Length': archive.length,
    });
    response.send(archive);
  }
}
