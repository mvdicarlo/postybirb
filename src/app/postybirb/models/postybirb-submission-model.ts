import * as uniqid from 'uniqid';

import { FileInformation } from '../../commons/models/file-information';
import { FileObject } from '../../commons/interfaces/file-obect.interface';
import { FileWrapper } from '../../commons/models/posty-birb/file-wrapper';
import { FileHandler } from './file-handler';

import { SubmissionStatus } from '../enums/submission-status.enum';
import { PostyBirbSubmissionData } from '../../commons/interfaces/posty-birb-submission-data.interface';
import { SubmissionData } from '../interfaces/submission-data.interface';

export interface SubmissionArchive {
  meta: SubmissionMetaData;
  descriptionInfo: any;
  tagInfo: any;
  optionInfo: any;
  submissionFile: FileObject;
  submissionBuffer?: string;
  thumbnailFile?: FileObject;
  additionalFiles?: FileObject[];
  websites?: string[];
}

export interface SubmissionMetaData {
  id: string;
  title: string;
  schedule: any;
  type: string;
  rating: string;
  unpostedWebsites: string[];
  submissionStatus: SubmissionStatus;
  order: number;
}

export class PostyBirbSubmissionModel {
  private id: string

  private submissionFile: FileWrapper;
  private thumbnailFile: FileWrapper;
  private additionalFiles: FileWrapper[] = [];

  public title: string;
  public schedule: any;
  public rating: string;
  public type: string;
  public descriptionInfo: any;
  public tagInfo: any;
  public optionInfo: any;

  public order: number;
  public unpostedWebsites: string[] = [];
  public submissionStatus: SubmissionStatus = SubmissionStatus.UNPOSTED;

  constructor(submission: FileObject | FileInformation, id?: string) {
    this.setId(id);
    this.setSubmissionFile(submission);
    this.setThumbnailFile(null);
  }

  public setId(id: string): void { this.id = id ? id : PostyBirbSubmissionModel.generateId() }
  public getId(): string { return this.id }

  public setSubmissionFile(submission: FileObject | FileInformation): void {
    this.submissionFile = new FileWrapper(submission);
    this.type = FileHandler.getTypeByExtension(this.getSubmissionFileObject());
  }

  public getSubmissionFileSource(): Promise<string> {
    return this.submissionFile.getFileSrc();
  }

  public getSubmissionFileIcon(dimensions: { height: number, width: number }): Promise<string> {
    return new Promise(function(resolve, reject) {
      if (this.submissionFile) {
        this.submissionFile.getIcon(dimensions).then(data => {
          resolve(data);
        });
      } else {
        reject(Error('No set submission file'));
      }
    }.bind(this));
  }

  public getPreloadedSubmissionFile(): Promise<FileInformation> {
    return new Promise(function(resolve, reject) {
      if (this.submissionFile) {
        this.submissionFile.getFileInformationEnsureLoaded().then(fileInformation => resolve(fileInformation));
      } else {
        reject(Error('No set submission file'));
      }
    }.bind(this));
  }

  public getSubmissionFileObject(): FileObject {
    return this.submissionFile.getFileObject();
  }

  public getSubmissionFile(): FileInformation {
    return this.submissionFile.getFileInformation();
  }

  public setThumbnailFile(submission: FileObject | FileInformation): void {
    this.thumbnailFile = new FileWrapper(submission);
  }

  public getThumbnailFileSource(): Promise<string> {
    return this.thumbnailFile.getFileSrc();
  }

  public getThumbnailFileIcon(dimensions: { height: number, width: number }): Promise<string> {
    return new Promise(function(resolve, reject) {
      if (this.thumbnailFile) {
        this.thumbnailFile.getIcon(dimensions).then(data => {
          resolve(data);
        });
      } else {
        reject(Error('No set thumbnail file'));
      }
    }.bind(this));
  }

  public getPreloadedThumbnailFile(): Promise<FileInformation> {
    return new Promise(function(resolve, reject) {
      if (this.submissionFile) {
        this.thumbnailFile.getFileInformationEnsureLoaded().then(fileInformation => resolve(fileInformation));
      } else {
        reject(Error('No set submission file'));
      }
    }.bind(this));
  }

  public getThumbnailFileObject(): FileObject {
    return this.thumbnailFile.getFileObject();
  }

  public getThumbnailFile(): FileInformation {
    return this.thumbnailFile.getFileInformation();
  }

  public setAdditionalFiles(files: Array<FileInformation | FileObject> = []): void {
    this.additionalFiles = files.map(f => new FileWrapper(f));
  }

  public addAdditionalFiles(files: Array<FileInformation> = []): void {
    files.forEach(file => this.additionalFiles.push(new FileWrapper(file)));
  }

  public getAdditionalFilesSource(): Promise<string[]> {
    return Promise.all(this.additionalFiles.map(f => f.getFileSrc()));
  }

  public getAdditionalFilesFileInformation(): FileInformation[] {
    return this.additionalFiles.map(f => f.getFileInformation());
  }

  public getPreloadedAdditionalFiles(): Promise<FileInformation[]> {
    return Promise.all(this.additionalFiles.map(f => f.getFileInformationEnsureLoaded()));
  }

  public getAdditionalFilesFileObjects(): FileObject[] {
    return this.additionalFiles.map(f => f.getFileObject());
  }

  public getAllForWebsite(website: string): PostyBirbSubmissionData {
    const defaultDescriptionData = (this.descriptionInfo || {}).default;

    const defaultDescription = defaultDescriptionData ? defaultDescriptionData.description : '';
    const customDescription = this.descriptionInfo[website];

    let description = defaultDescription;
    let parseDescription = defaultDescriptionData ? !defaultDescriptionData.simple : true;
    if (customDescription && !customDescription.useDefault) { // Determine whether to use custom or default description
      description = customDescription.description;
      parseDescription = customDescription && !customDescription.useDefault ? !customDescription.simple : true;
    }

    const customTags = this.tagInfo[website];
    const overwriteTags: boolean = customTags && customTags.overwrite ? true : false;
    const defaultTags = overwriteTags ? [] : this.tagInfo.default ? this.tagInfo.default.tags : [];

    const submissionData: SubmissionData = {
      title: this.title,
      submissionFile: this.getSubmissionFile(),
      thumbnailFile: this.getThumbnailFile() || new FileInformation(null, false),
      additionalFiles: this.getAdditionalFilesFileInformation(),
      submissionRating: this.rating,
      submissionType: this.type
    };

    return {
      description: description || '',
      parseDescription,
      defaultTags,
      customTags: customTags && customTags.tags ? customTags.tags : [],
      options: Object.assign({}, this.optionInfo[website]),
      submissionData
    };
  }

  public getAllForWebsiteNoFile(website: string): PostyBirbSubmissionData { // since I use this a lot in checking, I want a no file version
    const defaultDescriptionData = (this.descriptionInfo || {}).default;

    const defaultDescription = defaultDescriptionData ? defaultDescriptionData.description : '';
    const customDescription = this.descriptionInfo[website];

    let description = defaultDescription;
    let parseDescription = defaultDescriptionData ? !defaultDescriptionData.simple : true;
    if (customDescription && !customDescription.useDefault) { // Determine whether to use custom or default description
      description = customDescription.description;
      parseDescription = customDescription && !customDescription.useDefault ? !customDescription.simple : true;
    }

    const customTags = this.tagInfo[website];
    const overwriteTags: boolean = customTags && customTags.overwrite ? true : false;
    const defaultTags = overwriteTags ? [] : this.tagInfo.default ? this.tagInfo.default.tags : [];

    const submissionData: SubmissionData = {
      title: this.title,
      submissionFile: null,
      thumbnailFile: null,
      additionalFiles: null,
      submissionRating: this.rating,
      submissionType: this.type
    };

    return {
      description: description || '',
      parseDescription,
      defaultTags,
      customTags: customTags && customTags.tags ? customTags.tags : [],
      options: Object.assign({}, this.optionInfo[website]),
      submissionData
    };
  }

  public asSubmissionArchive(): SubmissionArchive {
    return {
      meta: this.getSubmissionMetaData(),
      descriptionInfo: this.descriptionInfo,
      tagInfo: this.tagInfo,
      optionInfo: this.optionInfo,
      submissionFile: this.submissionFile.getFileObject(),
      submissionBuffer: this.submissionFile.getFileObject().path ? null : this.submissionFile.getFileInformation().getFileBuffer().toString('base64'),
      thumbnailFile: this.thumbnailFile ? this.thumbnailFile.getFileObject() : null,
      additionalFiles: this.getAdditionalFilesFileObjects(),
    }
  }

  public asSubmissionTemplate(): SubmissionArchive {
    return {
      meta: this.getSubmissionMetaData(),
      submissionFile: null,
      descriptionInfo: this.descriptionInfo,
      tagInfo: this.tagInfo,
      optionInfo: this.optionInfo,
    }
  }

  public getSubmissionMetaData(): SubmissionMetaData {
    return {
      id: this.id,
      title: this.title,
      order: this.order,
      type: this.type,
      rating: this.rating,
      schedule: this.schedule,
      unpostedWebsites: this.unpostedWebsites,
      submissionStatus: this.submissionStatus
    }
  }

  public static generateId(): string {
    return uniqid();
  }

  public static fromArchive(archive: SubmissionArchive): PostyBirbSubmissionModel {
    const model: PostyBirbSubmissionModel = new PostyBirbSubmissionModel(archive.submissionBuffer ? new FileInformation(window['Buffer'].from(archive.submissionBuffer, 'base64'), false, archive.submissionFile ? archive.submissionFile.name : null) : archive.submissionFile, archive.meta.id);

    const meta: SubmissionMetaData = archive.meta;
    model.order = meta.order;
    model.rating = meta.rating;
    model.schedule = meta.schedule;
    model.submissionStatus = meta.submissionStatus;
    model.title = meta.title;
    model.type = meta.type ? meta.type : model.type;
    model.unpostedWebsites = meta.unpostedWebsites;

    model.descriptionInfo = archive.descriptionInfo;
    model.tagInfo = archive.tagInfo;
    model.optionInfo = archive.optionInfo;

    model.setAdditionalFiles(archive.additionalFiles);
    model.setThumbnailFile(archive.thumbnailFile);

    return model
  }
}
