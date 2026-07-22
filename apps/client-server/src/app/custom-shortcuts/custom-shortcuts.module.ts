import { Module } from '@nestjs/common';
import { CustomShortcutEventListener } from './custom-shortcut-event.listener';
import { CustomShortcutsController } from './custom-shortcuts.controller';
import { CustomShortcutsService } from './custom-shortcuts.service';

@Module({
  controllers: [CustomShortcutsController],
  providers: [CustomShortcutsService, CustomShortcutEventListener],
  exports: [CustomShortcutsService],
})
export class CustomShortcutsModule {}
