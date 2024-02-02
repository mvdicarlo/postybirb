import { v4 } from 'uuid';
import { Logger, PostyBirbLogger } from '../logger';

type IServiceContextOptions = {
  requestId?: string;
};

export class ServiceContext {
  readonly requestId: string;

  readonly operationName: string;

  private logger: PostyBirbLogger;

  get log() {
    return this.logger.withMetadata({ epoch: Date.now() });
  }

  constructor(operationName: string, options?: IServiceContextOptions) {
    this.operationName = operationName;
    this.requestId = options?.requestId ?? v4();
    this.logger = Logger().withContext(this);
  }
}
