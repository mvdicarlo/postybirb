import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
  IsTestEnvironment,
  PAC_SCRIPT_API_PATH,
  parsePacScriptTokenFromUrl,
  PostyBirbEnvConfig,
  resolvePacHttpPort,
} from '@postybirb/utils/common';
import { createServer, type Server } from 'node:http';
import {
  pacScriptResponseHeaders,
  PacScriptDeliveryService,
} from './pac-script-delivery.service';

@Injectable()
export class PacHttpServerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = Logger('PacHttpServer');

  private server: Server | null = null;

  constructor(
    private readonly pacScriptDeliveryService: PacScriptDeliveryService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (IsTestEnvironment()) {
      return;
    }

    await this.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  private async start(): Promise<void> {
    const pacPort = resolvePacHttpPort(PostyBirbEnvConfig.port);
    const portNumber = parseInt(pacPort, 10);
    if (Number.isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      throw new Error(`Invalid PAC HTTP port: ${pacPort}`);
    }

    this.server = createServer((req, res) => {
      void this.handleRequest(req, res);
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(portNumber, '127.0.0.1', () => {
        this.server!.off('error', reject);
        resolve();
      });
    });

    this.logger
      .withMetadata({ pacPort, path: PAC_SCRIPT_API_PATH })
      .info('PAC HTTP server listening on loopback');
  }

  private async handleRequest(
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
  ): Promise<void> {
    if (req.method !== 'GET' || !req.url) {
      res.writeHead(404);
      res.end();
      return;
    }

    const token = parsePacScriptTokenFromUrl(req.url);
    if (!token) {
      res.writeHead(404);
      res.end();
      return;
    }

    const result = await this.pacScriptDeliveryService.resolveForToken(token);
    if (result.status === 'not_found') {
      res.writeHead(404);
      res.end();
      return;
    }

    if (result.status === 'error') {
      res.writeHead(500);
      res.end();
      return;
    }

    res.writeHead(200, pacScriptResponseHeaders);
    res.end(result.body);
  }

  private async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    this.server = null;
  }
}
