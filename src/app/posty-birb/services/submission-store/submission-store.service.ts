import { Injectable } from '@angular/core';
import { SubmissionArchive } from '../../../commons/models/posty-birb/posty-birb-submission';

@Injectable()
export class SubmissionStoreService {
  private readonly SCHEDULED_STORE: string = 'scheduledStore';
  private readonly UNSCHEDULED_STORE: string = 'unscheduledStore';

  private scheduledSubmissions: Map<string, SubmissionArchive>;
  private unscheduledSubmissions: Map<string, SubmissionArchive>;

  constructor() {
    this.scheduledSubmissions = new Map();
    this.unscheduledSubmissions = new Map();

    this.loadStore(this.SCHEDULED_STORE, this.scheduledSubmissions);
    this.loadStore(this.UNSCHEDULED_STORE, this.unscheduledSubmissions);
  }

  private loadStore(key: string, map: Map<string, SubmissionArchive>): void {
    const archives: SubmissionArchive[] = store.get(key) || [];
    for (let i = 0; i < archives.length; i++) {
      const archive: SubmissionArchive = archives[i];
      if (archive.meta) map.set(archive.meta.id, archive);
    }
  }

  public delete(id: string, save: boolean): SubmissionArchive {
    let archive: SubmissionArchive = null;

    if (this.unscheduledSubmissions.has(id)) {
      archive = this.unscheduledSubmissions.get(id);
      this.unscheduledSubmissions.delete(id);

      if (save) this.save(this.UNSCHEDULED_STORE, this.unscheduledSubmissions);
    } else if (this.scheduledSubmissions.has(id)) {
      archive = this.scheduledSubmissions.get(id);
      this.scheduledSubmissions.delete(id);

      if (save) this.save(this.SCHEDULED_STORE, this.scheduledSubmissions);
    }

    return archive;
  }

  public get(id: string): SubmissionArchive {
    let archive: SubmissionArchive = null;

    if (this.unscheduledSubmissions.has(id)) archive = this.unscheduledSubmissions.get(id);
    else if (this.scheduledSubmissions.has(id)) archive = this.scheduledSubmissions.get(id);

    return archive;
  }

  public getSize(unscheduled: boolean, scheduled: boolean): number {
    let size: number = 0;

    if (unscheduled) size += this.unscheduledSubmissions.size;
    if (scheduled) size += this.scheduledSubmissions.size;

    return size;
  }

  public getAll(unscheduled: boolean, scheduled: boolean): SubmissionArchive[] {
    const allArchives: SubmissionArchive[] = [];

    if (unscheduled) {
      this.unscheduledSubmissions.forEach((value, key, map) => {
        allArchives.push(value);
      });
    }

    if (scheduled) {
      this.scheduledSubmissions.forEach((value, key, map) => {
        allArchives.push(value);
      });
    }

    return allArchives;
  }

  public update(archive: SubmissionArchive): void {
    this.delete(archive.meta.id, false);

    let schedule: any = archive.meta.schedule;
    if (schedule) this.scheduledSubmissions.set(archive.meta.id, archive);
    else this.unscheduledSubmissions.set(archive.meta.id, archive);

    this.saveAll();
  }

  public updateAll(archives: SubmissionArchive[]): void {
    const updates = archives || [];
    for (let i = 0; i < updates.length; i++) {
      this.update(updates[i]);
    }
  }

  public clear(unscheduled: boolean, scheduled: boolean): void {
    if (unscheduled) {
      this.unscheduledSubmissions.clear();
      store.remove(this.UNSCHEDULED_STORE);
    }

    if (scheduled) {
      this.scheduledSubmissions.clear();
      store.remove(this.SCHEDULED_STORE);
    }
  }

  private saveAll(): void {
    this.save(this.UNSCHEDULED_STORE, this.unscheduledSubmissions);
    this.save(this.SCHEDULED_STORE, this.scheduledSubmissions);
  }

  private save(key: string, map: Map<string, SubmissionArchive>): void {
    const archives = map.values();
    const savable: SubmissionArchive[] = [];

    for (let next = archives.next(); !next.done; next = archives.next()) {
      const archive: SubmissionArchive = next.value;
      if (archive.submissionFile.path) savable.push(archive);
    }

    store.set(key, savable);
  }

}
