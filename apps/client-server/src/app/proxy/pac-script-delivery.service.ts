import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { toError } from '@postybirb/utils/common';
import {
  PAC_SCRIPT_MEDIA_TYPE,
  PAC_SCRIPT_CACHE_CONTROL,
} from '@postybirb/http';
import { PacScriptService } from './pac-script.service';

export type PacScriptDeliveryResult =
  | { status: 'ok'; body: string }
  | { status: 'not_found' }
  | { status: 'error' };

export const pacScriptResponseHeaders = {
  'Content-Type': PAC_SCRIPT_MEDIA_TYPE,
  'Cache-Control': PAC_SCRIPT_CACHE_CONTROL,
} as const;

@Injectable()
export class PacScriptDeliveryService {
  private readonly logger = Logger('PacScriptDelivery');

  constructor(private readonly pacScriptService: PacScriptService) {}

  async resolveForToken(token: string): Promise<PacScriptDeliveryResult> {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      return { status: 'not_found' };
    }

    try {
      const body =
        await this.pacScriptService.generateForToken(normalizedToken);
      if (!body) {
        return { status: 'not_found' };
      }

      return { status: 'ok', body };
    } catch (error) {
      this.logger.withError(toError(error)).warn('PAC delivery failed');
      return { status: 'error' };
    }
  }
}
