import { Module, forwardRef } from '@nestjs/common';
import { CustomShortcutsModule } from '../custom-shortcuts/custom-shortcuts.module';
import { FormGeneratorModule } from '../form-generator/form-generator.module';
import { SettingsModule } from '../settings/settings.module';
import { TagConvertersModule } from '../tag-converters/tag-converters.module';
import { WebsiteImplProvider } from '../websites/implementations/provider';
import { DescriptionParserService } from './parsers/description-parser.service';
import { TagParserService } from './parsers/tag-parser.service';
import { PostParsersService } from './post-parsers.service';

@Module({
  imports: [
    TagConvertersModule,
    FormGeneratorModule,
    SettingsModule,
    forwardRef(() => CustomShortcutsModule),
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
