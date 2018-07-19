import { SubmissionArchive, PostyBirbSubmission } from '../../../commons/models/posty-birb/posty-birb-submission';

export class EditSubmission {
  static readonly type: string = '[Submission] Edit';
  constructor(public archive: SubmissionArchive, public copy: boolean) { }
}

export class AddSubmission {
  static readonly type: string = '[Submission] Add';
  constructor(public archive: SubmissionArchive, public update: boolean) { }
}

export class DeleteSubmission {
  static readonly type: string = '[Submission] Delete';
  constructor(public archive: SubmissionArchive) { }
}

export class QueueSubmission {
  static readonly type: string = '[Submission] Queue';
  constructor(public archive: SubmissionArchive) { }
}

export class DequeueSubmission {
  static readonly type: string = '[Submission] Dequeue';
  constructor(public archive: SubmissionArchive, public interrupted: boolean = false) { }
}

export class DequeueAllSubmissions {
  static readonly type: string = '[Submission] Dequeue All';
  constructor() { }
}

export class CompleteSubmission {
  static readonly type: string = '[Submission] Completed';
  constructor(public submission: PostyBirbSubmission) { }
}

export class ReorderSubmission {
  static readonly type: string = '[Submission] Reorder';
  constructor(public archive: SubmissionArchive) { }
}

export class LogSubmissionPost {
  static readonly type: string = '[Submission] Log Post';
  constructor(public submission: PostyBirbSubmission, public responses: any[]) { }
}
