import { Session } from 'electron';
import { ProxyProfile } from '@postybirb/utils/common';

type ProxyCredentials = {
  username: string;
  password: string;
};

/**
 * Stores proxy auth credentials per partition and resolves them for Chromium
 * sessions and ClientRequest login events.
 */
export class ProxyAuthStore {
  private readonly credentials = new Map<string, ProxyCredentials>();

  private readonly sessionPartitionIds = new WeakMap<Session, string>();

  syncPartitionProfile(partitionId: string, profile: ProxyProfile | null): void {
    if (profile?.enabled && profile.username && profile.password) {
      this.credentials.set(partitionId, {
        username: profile.username,
        password: profile.password,
      });
      return;
    }

    this.credentials.delete(partitionId);
  }

  bindSession(partitionId: string, targetSession: Session): void {
    this.sessionPartitionIds.set(targetSession, partitionId);
  }

  getForPartition(partitionId?: string | null): ProxyCredentials | null {
    if (!partitionId) {
      return null;
    }

    return this.credentials.get(partitionId) ?? null;
  }

  getPartitionIds(): string[] {
    return [...this.credentials.keys()];
  }

  getForSession(
    targetSession: Session,
    resolveSessionPartition: (session: Session) => string | null,
  ): ProxyCredentials | null {
    const mapped = this.sessionPartitionIds.get(targetSession);
    if (mapped) {
      return this.getForPartition(mapped);
    }

    const partitionId = resolveSessionPartition(targetSession);
    if (!partitionId) {
      return null;
    }

    this.sessionPartitionIds.set(targetSession, partitionId);
    return this.getForPartition(partitionId);
  }

  clear(): void {
    this.credentials.clear();
  }
}
