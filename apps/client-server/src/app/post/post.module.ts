import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
