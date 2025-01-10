import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FormGeneratorModule } from '../form-generator/form-generator.module';
import { SettingsModule } from '../settings/settings.module';
import { TagConvertersModule } from '../tag-converters/tag-converters.module';
import { WebsiteImplProvider } from '../websites/implementations/provider';
import { DescriptionParserService } from './parsers/description-parser.service';
import { TagParserService } from './parsers/tag-parser.service';
import { PostParsersService } from './post-parsers.service';

@Module({
  imports: [
    DatabaseModule,
    TagConvertersModule,
    FormGeneratorModule,
    SettingsModule,
  ],
  providers: [
    PostParsersService,
    TagParserService,
    WebsiteImplProvider,
    DescriptionParserService,
  ],
  exports: [PostParsersService, TagParserService, DescriptionParserService],
})
export class PostParsersModule {}
