import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TagConvertersModule } from '../tag-converters/tag-converters.module';
import { WebsiteImplProvider } from '../websites/implementations';
import { PostParsersService } from './post-parsers.service';

@Module({
  imports: [DatabaseModule, TagConvertersModule],
  providers: [PostParsersService, WebsiteImplProvider],
  exports: [PostParsersService],
})
export class PostParsersModule {}
