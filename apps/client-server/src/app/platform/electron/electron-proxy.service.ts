import { app, session, type ProxyConfig, type Session } from 'electron';
import { Logger } from '@postybirb/logger';
import type { ProxyConfiguration } from '@postybirb/types';
import {
  PlatformProxyService,
} from '@postybirb/platform';
import {
  PostyBirbEnvConfig,
  StartupOptionsManager,
  toError,
} from '@postybirb/utils/common';
import {
  buildChromiumProxyBypassRules,
  buildPacScriptUrl,
  buildSessionProxyRules,
  resolveProxyAuthCredentials,
  syncProxyAuthPool,
} from '@postybirb/proxy';

const DEFAULT_PROXY_CONFIGURATION: ProxyConfiguration = {
  mode: 'system',
  pool: [],
  routing: {},
};

export class ElectronProxyService extends PlatformProxyService {
  private readonly logger = Logger('ElectronProxyBootstrap');

  private activeProxyConfig: ProxyConfig = { mode: 'system' };

  constructor() {
    super();

    if (typeof app?.on === 'function') {
      app.on('login', (event, _webContents, _details, authInfo, callback) => {
        if (!authInfo.isProxy) {
          return;
        }

        const credentials = resolveProxyAuthCredentials(authInfo);
        if (!credentials) {
          return;
        }

        event.preventDefault();
        callback(credentials.username, credentials.password);
      });
    }
  }

  private resolveSessionProxyConfig(config: ProxyConfiguration): ProxyConfig {
    switch (config.mode) {
      case 'direct':
        return { mode: 'direct' };
      case 'fixed_servers': {
        const entry = config.pool.find(
          (poolEntry) => poolEntry.id === config.fixedProxyId,
        );
        if (!entry) {
          return { mode: 'system' };
        }

        const proxyRules = buildSessionProxyRules(entry);
        if (!proxyRules) {
          return { mode: 'system' };
        }

        return {
          mode: 'fixed_servers',
          proxyRules,
          proxyBypassRules: buildChromiumProxyBypassRules(
            PostyBirbEnvConfig.port,
          ),
        };
      }
      case 'pac_routing': {
        if (!config.pacAccessToken?.trim()) {
          return { mode: 'system' };
        }

        const pacScript = buildPacScriptUrl(config, PostyBirbEnvConfig.port);
        if (!pacScript) {
          return { mode: 'system' };
        }

        return {
          mode: 'pac_script',
          pacScript,
        };
      }
      case 'system':
      default:
        return { mode: 'system' };
    }
  }

  private getStartupProxyConfiguration(): ProxyConfiguration {
    try {
      return StartupOptionsManager.get().proxy;
    } catch {
      return DEFAULT_PROXY_CONFIGURATION;
    }
  }

  private async applyProxyConfigToSession(
    targetSession: Session,
    proxyConfig: ProxyConfig,
  ): Promise<void> {
    try {
      await targetSession.setProxy(proxyConfig);
    } catch (error) {
      this.logger.withError(toError(error)).warn('setProxy failed');
      throw error;
    }
  }

  private async finalizeSessions(
    sessions: Session[],
    proxyConfig: ProxyConfig,
  ): Promise<void> {
    if (proxyConfig.mode === 'pac_script') {
      for (const targetSession of sessions) {
        if (typeof targetSession.forceReloadProxyConfig === 'function') {
          await targetSession.forceReloadProxyConfig();
        }
      }
    }

    for (const targetSession of sessions) {
      targetSession.closeAllConnections();
    }
  }

  async applyProxy(
    partitionIds: string[],
    configuration?: ProxyConfiguration,
  ): Promise<void> {
    const resolvedConfiguration =
      configuration ?? this.getStartupProxyConfiguration();
    syncProxyAuthPool(resolvedConfiguration.pool);

    const proxyConfig = this.resolveSessionProxyConfig(resolvedConfiguration);

    if (!app.isReady()) {
      this.activeProxyConfig = proxyConfig;
      return;
    }

    this.activeProxyConfig = proxyConfig;
    const sessions: Session[] = [
      session.defaultSession,
      ...partitionIds.map((partitionId) => session.fromPartition(partitionId)),
    ];

    for (const targetSession of sessions) {
      await this.applyProxyConfigToSession(targetSession, proxyConfig);
    }

    await this.finalizeSessions(sessions, proxyConfig);
  }

  async onSessionCreated(createdSession: Session): Promise<void> {
    if (!app.isReady()) {
      return;
    }
    await this.applyProxyConfigToSession(
      createdSession,
      this.activeProxyConfig,
    );
    await this.finalizeSessions([createdSession], this.activeProxyConfig);
  }
}
