import { v4 } from 'uuid';
import { CreateLogger, LLogger } from '../logger';

type IServiceContextOptions = {
  requestId?: string;
};

export class ServiceContext {
  readonly requestId: string;

  readonly operationName: string;

  private logger: LLogger;

  get log() {
    return this.logger.withMetadata({ epoch: Date.now() });
  }

  constructor(operationName: string, options?: IServiceContextOptions) {
    this.operationName = operationName;
    this.requestId = options?.requestId ?? v4();
    this.logger = CreateLogger().withContext(this);
  }
}
