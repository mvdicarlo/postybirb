import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TagConvertersModule } from '../tag-converters/tag-converters.module';
import { WebsiteImplProvider } from '../websites/implementations';
import { PostParsersService } from './post-parsers.service';
import { RatingParserService } from './rating-parser.service';
import { TagParserService } from './tag-parser.service';

@Module({
  imports: [DatabaseModule, TagConvertersModule],
  providers: [
    PostParsersService,
    TagParserService,
    RatingParserService,
    WebsiteImplProvider,
  ],
  exports: [PostParsersService],
})
export class PostParsersModule {}
