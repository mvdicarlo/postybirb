import { Controller } from '@nestjs/common';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { CustomShortcutsService } from './custom-shortcuts.service';

@Controller('custom-shortcut')
export class CustomShortcutsController extends PostyBirbController<'CustomShortcutSchema'> {
  constructor(readonly service: CustomShortcutsService) {
    super(service);
  }
}
