import { Module } from '@nestjs/common';
import { CustomShortcutsController } from './custom-shortcuts.controller';
import { CustomShortcutsService } from './custom-shortcuts.service';

@Module({
  controllers: [CustomShortcutsController],
  providers: [CustomShortcutsService],
  exports: [CustomShortcutsService],
})
export class CustomShortcutsModule {}