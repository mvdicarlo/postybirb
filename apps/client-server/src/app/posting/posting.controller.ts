import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { UnitOfWorkId } from '@postybirb/types';
import { GetIncompleteWorkDto } from './dtos/get-incomplete-work.dto';
import { PostingService } from './posting.service';

@ApiTags('posting')
@Controller('posting')
export class PostingController {
  constructor(readonly service: PostingService) {}

  @Post()
  @ApiOkResponse({ description: 'Creates or resumes posting work.' })
  post(@Body() request: GetIncompleteWorkDto) {
    return this.service.post(request.submissionId, request.evictions, request.targets);
  }

  @Post('dry-run')
  @ApiOkResponse({
    description: 'Work that would run if the post were started now.',
  })
  dryRun(@Body() request: GetIncompleteWorkDto) {
    return this.service.dryRun(request.submissionId, request.evictions, request.targets);
  }

  @Post('incomplete-work')
  @ApiOkResponse({ description: 'Remaining, removed, and evicted posting work.' })
  getIncompleteWork(@Body() request: GetIncompleteWorkDto) {
    return this.service.getIncompleteWork(
      request.submissionId,
      request.evictions,
      request.targets,
    );
  }

  @Get('is-paused')
  @ApiOkResponse({ description: 'Get if posting is paused.' })
  async isPaused() {
    return { paused: await this.service.arePostsPaused() };
  }

  @Post('pause')
  @ApiOkResponse({ description: 'Posting paused.' })
  async pause() {
    await this.service.pausePosts();
    return { paused: await this.service.arePostsPaused() };
  }

  @Post('unpause')
  @ApiOkResponse({ description: 'Posting resumed.' })
  async unpause() {
    await this.service.unpausePosts();
    return { paused: await this.service.arePostsPaused() };
  }

  @Post('evict/:unitOfWorkId')
  @ApiOkResponse({ description: 'Unit of work evicted.' })
  evictUnitOfWork(@Param('unitOfWorkId') unitOfWorkId: UnitOfWorkId) {
    return this.service.evictUnitOfWork(unitOfWorkId);
  }

  @Post('/cancel/:postId')
  cancelPost(@Body() request: { reason?: string }, @Param('postId') postId: string) {
    return this.service.cancelPost(postId, request.reason);
  }
}