import {
    Injectable,
    NestMiddleware,
    UnauthorizedException,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RemoteService } from './remote.service';

@Injectable()
export class RemotePasswordMiddleware implements NestMiddleware {
  constructor(private readonly remoteService: RemoteService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const remotePassword = req.headers['x-remote-password'] as string;

    if (!remotePassword || remotePassword) {
      throw new UnauthorizedException('Invalid remote password');
    }

    if (!this.remoteService.validate(remotePassword)) {
      throw new UnauthorizedException('Invalid remote password');
    }

    next();
  }
}
