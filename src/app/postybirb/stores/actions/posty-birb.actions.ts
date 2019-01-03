import { SubmissionArchive, PostyBirbSubmissionModel } from '../../models/postybirb-submission-model';
import { SubmissionStatus } from '../../enums/submission-status.enum';

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

export class UpdateWebsites {
    static readonly type: string ='[Submission] Website Update';
    constructor(public archive: SubmissionArchive, public websites: string[]) {
      this.archive = Helpers.copy(archive);
    }
}

export class UpdateStatus {
    static readonly type: string ='[Submission] Status Update';
    constructor(public archive: SubmissionArchive, public status: SubmissionStatus) {
      this.archive = Helpers.copy(archive);
    }
}

export class UpdateSubmission { // refers to editing submissions only
  static readonly type: string = '[Submission] Update';
  constructor(public archive: SubmissionArchive) {
    this.archive = Helpers.copy(archive);
  }
}

export class EditSubmission {
  static readonly type: string = '[Submission] Edit';
  constructor(public archive: SubmissionArchive, public copy: boolean) {
    this.archive = Helpers.copy(archive);
  }
}

export class AddSubmission {
  static readonly type: string = '[Submission] Add';
  constructor(public archive: SubmissionArchive, public update: boolean, public openSheet: boolean = true) {
    this.archive = Helpers.copy(archive);
  }
}

export class DeleteSubmission {
  static readonly type: string = '[Submission] Delete';
  constructor(public archive: SubmissionArchive) { }
}

export class CompleteSubmission {
  static readonly type: string = '[Submission] Completed';
  constructor(public submission: PostyBirbSubmissionModel) { }
}

export class ReorderSubmission {
  static readonly type: string = '[Submission] Reorder';
  constructor(public previousIndex: number, public currentIndex: number) {}
}

export class LogSubmissionPost {
  static readonly type: string = '[Submission] Log Post';
  constructor(public submission: PostyBirbSubmissionModel, public responses: any[]) { }
}
