import { SubmissionArchive, PostyBirbSubmissionModel } from '../../models/postybirb-submission-model';

class Helpers {
  static copy(data: any): any {
    try {
      return JSON.parse(JSON.stringify(data), (key, value) => {
        if (value !== null) return value
      });
    } catch (e) {
      console.error(e);
      return data;
    }
  }
}

export class EnqueueSubmission {
  static readonly type: string = '[Submission] Enqueue';
  constructor(public archive: SubmissionArchive) {
    this.archive = Helpers.copy(archive);
  }
}

export class DequeueSubmission {
  static readonly type: string = '[Submission] Dequeue';
  constructor(public archive: SubmissionArchive, public interrupted: boolean = false) {
    this.archive = Helpers.copy(archive);
  }
}

export class DequeueAllSubmissions {
  static readonly type: string = '[Submission] Dequeue All';
  constructor() { }
}

export class CompleteSubmission {
  static readonly type: string = '[Submission] Completed From Queue';
  constructor(public submission: PostyBirbSubmissionModel, public dequeueAll: boolean) { }
}
