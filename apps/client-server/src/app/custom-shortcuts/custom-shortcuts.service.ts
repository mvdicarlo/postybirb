import { Injectable, Optional } from '@nestjs/common';
import { CUSTOM_SHORTCUT_UPDATES } from '@postybirb/socket-events';
import { PostyBirbService } from '../common/service/postybirb-service';
import { WSGateway } from '../web-socket/web-socket-gateway';

@Injectable()
export class CustomShortcutsService extends PostyBirbService<'CustomShortcutSchema'> {
  constructor(@Optional() webSocket?: WSGateway) {
    super('CustomShortcutSchema', webSocket);
    this.repository.subscribe('CustomShortcutSchema', () => this.emit());
  }

  public async emit() {
    const dtos = await this.findAll();
    super.emit({
      event: CUSTOM_SHORTCUT_UPDATES,
      data: dtos.map((dto) => dto.toDTO()),
    });
  }
}
