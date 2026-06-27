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
    try {
      if (req.baseUrl.startsWith('/api/file/')) {
        // Skip authentication for file API routes
        // This is mostly just to avoid nuisance password injection into query params
        next();
        return;
      }

      if (req.baseUrl.startsWith('/api/remote/ping')) {
        // Skip authentication for ping API routes to let user check the password
        next();
        return;
      }

      const remotePassword = req.headers['x-remote-password'] as string;

      if (!remotePassword) {
        throw new UnauthorizedException('No remote password provided');
      }

      const isValid = await this.remoteService.validate(remotePassword);
      if (!isValid) {
        throw new UnauthorizedException('Invalid remote password');
      }

      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      next(error); // Pass the error to the global error handler
    }
  }
}
