import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetIncompleteWorkDto } from './dtos/get-incomplete-work.dto';
import { PostingService } from './posting.service';

@ApiTags('posting')
@Controller('posting')
export class PostingController {
  constructor(readonly service: PostingService) {}

  @Post()
  @ApiOkResponse({ description: 'Creates or resumes posting work.' })
  post(@Body() request: GetIncompleteWorkDto) {
    return this.service.post(request.submissionId, request.evictions);
  }

  @Post('incomplete-work')
  @ApiOkResponse({ description: 'Remaining, removed, and evicted posting work.' })
  getIncompleteWork(@Body() request: GetIncompleteWorkDto) {
    return this.service.getIncompleteWork(
      request.submissionId,
      request.evictions,
    );
  }

  @Post('/cancel/:postId')
  cancelPost(@Body() request: { reason?: string }, @Param('postId') postId: string) {
    return this.service.cancelPost(postId, request.reason);
  }
}