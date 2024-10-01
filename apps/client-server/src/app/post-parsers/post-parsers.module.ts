import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FormGeneratorModule } from '../form-generator/form-generator.module';
import { SettingsModule } from '../settings/settings.module';
import { TagConvertersModule } from '../tag-converters/tag-converters.module';
import { WebsiteImplProvider } from '../websites/implementations';
import { DescriptionParserService } from './parsers/description-parser.service';
import { TagParserService } from './parsers/tag-parser.service';
import { TitleParserService } from './parsers/title-parser.service';
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
    TitleParserService,
    WebsiteImplProvider,
    DescriptionParserService,
  ],
  exports: [PostParsersService],
})
export class PostParsersModule {}
