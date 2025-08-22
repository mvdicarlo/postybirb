import { Module } from '@nestjs/common';
import { WebsiteOptionsModule } from '../website-options/website-options.module';
import { CustomShortcutsController } from './custom-shortcuts.controller';
import { CustomShortcutsService } from './custom-shortcuts.service';

@Module({
  imports: [WebsiteOptionsModule],
  controllers: [CustomShortcutsController],
  providers: [CustomShortcutsService],
  exports: [CustomShortcutsService],
})
export class CustomShortcutsModule {}
