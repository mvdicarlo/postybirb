import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SubmissionId } from '@postybirb/types';
import { PostManagerService } from './post-manager.service';

class CancelPostDto {
  submissionId: SubmissionId;
}

@ApiTags('post-manager')
@Controller('post-manager')
export class PostManagerController {
  constructor(readonly service: PostManagerService) {}

  @Post('cancel')
  @ApiOkResponse({ description: 'Post cancelled if running.' })
  async cancelIfRunning(@Body() request: CancelPostDto) {
    return this.service.cancelIfRunning(request.submissionId);
  }
  
  @Get('is-posting')
  @ApiOkResponse({ description: 'Check if a post is in progress.' })
  async isPosting() {
    return { isPosting: this.service.isPosting() };
  }
}