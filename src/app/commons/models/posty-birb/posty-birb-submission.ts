import { Subject, Observable } from 'rxjs';

import * as uniqid from 'uniqid';

import { FileInformation } from '../file-information';
import { FileWrapper } from './file-wrapper';
import { Collection } from './collection';
import { FileObject } from '../../interfaces/file-obect.interface';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { SubmissionStatus } from '../../../postybirb/enums/submission-status.enum';
import { SubmissionData } from '../../../postybirb/interfaces/submission-data.interface';

/**
 * @interface
 * @description model used for the storage of submissions into local storage
 * @deprecated - no longer used, merely kept for documentation
 */
export interface SubmissionArchive {
  meta: SubmissionMetaData;
  websiteFields: any;
  defaultFields: any;
  submissionFile: FileObject;
  submissionBuffer?: string;
  thumbnailFile?: FileObject;
  additionalFiles?: FileObject[];
}

/**
 * @interface
 * @description model used to store metadata for SubmissionArchive
 */
export interface SubmissionMetaData {
  id: string;
  title: string;
  unpostedWebsites: string[];
  submissionRating: string;
  submissionType: string;
  submissionStatus: SubmissionStatus;
  order: number;
  schedule: any;
}

/**
 * @class PostyBirbSubmission
 * @classdesc Class for storing information pertaining to PostyBirb Submissions
 */
export class PostyBirbSubmission {
  private id: string;

  private submissionFile: FileWrapper;
  private thumbnailFile: FileWrapper;
  private additionalFiles: FileWrapper[] = [];

  private websiteFields: Collection;
  private defaultFields: Collection;

  private unpostedWebsites: string[];
  private submissionRating: string;
  private submissionType: string;
  private title: string;
  private schedule: any;

  private order: number = 0;
  private submissionStatus: SubmissionStatus = SubmissionStatus.UNPOSTED;

  private subject: Subject<PostyBirbSubmission>;

  constructor(id: string, submissionFile: FileInformation | FileObject) {
    this.setId(id);
    this.setSubmissionFile(submissionFile);
    this.setThumbnailFile(new FileInformation(null, false));

    this.websiteFields = new Collection();
    this.defaultFields = new Collection();

    this.subject = new Subject();
  }

  public observe(): Observable<PostyBirbSubmission> {
    if (!this.subject) this.subject = new Subject();
    return this.subject.asObservable();
  }

  private emit(): void {
    if (this.subject) this.subject.next(this);
  }

  /**
   * @function fromArchive
   * @static
   * @description builds a PostyBirbSubmission object from a SubmissionArchive
   */
  public static fromArchive(archive: SubmissionArchive): PostyBirbSubmission {
    const model: PostyBirbSubmission = new PostyBirbSubmission(archive.meta.id, archive.submissionBuffer ? new FileInformation(Buffer.from(archive.submissionBuffer, 'base64'), false, archive.submissionFile ? archive.submissionFile.name : null) : archive.submissionFile);

    const meta: SubmissionMetaData = archive.meta;
    model.setSubmissionStatus(meta.submissionStatus);
    model.setOrder(meta.order);
    model.setSchedule(meta.schedule);
    model.setSubmissionType(meta.submissionType);
    model.setSubmissionRating(meta.submissionRating);
    model.setTitle(meta.title);
    model.setUnpostedWebsites(meta.unpostedWebsites);

    model.setThumbnailFile(archive.thumbnailFile);
    model.setAdditionalFiles(archive.additionalFiles);
    model.setDefaultFields(archive.defaultFields);
    model.setWebsiteFields(archive.websiteFields);

    return model;
  }

  /**
   * @function asSubmissionArchive
   * @return {SubmissionArchive} returns object in SubmissionArchive format
   */
  public asSubmissionArchive(): SubmissionArchive {
    return {
      meta: this.getSubmissionMetaData(),
      submissionFile: this.submissionFile.getFileObject(),
      submissionBuffer: this.submissionFile.getFileObject().path ? null : this.submissionFile.getFileInformation().getFileBuffer().toString('base64'),
      thumbnailFile: this.thumbnailFile ? this.thumbnailFile.getFileObject() : null,
      additionalFiles: this.getAdditionalFilesFileObjects(),
      websiteFields: this.getWebsiteFields(),
      defaultFields: this.getDefaultFields()
    };
  }

  public asSubmissionTemplate(): SubmissionArchive {
    return {
      meta: this.getSubmissionMetaData(),
      submissionFile: null,
      websiteFields: this.getWebsiteFields(),
      defaultFields: this.getDefaultFields()
    };
  }

  private getSubmissionMetaData(): SubmissionMetaData {
    return {
      title: this.getTitle(),
      order: this.getOrder(),
      submissionStatus: this.getSubmissionStatus(),
      submissionRating: this.getSubmissionRating(),
      submissionType: this.getSubmissionType(),
      id: this.getId(),
      schedule: this.getSchedule(),
      unpostedWebsites: this.getUnpostedWebsites()
    };
  }

  /**
   * @function getAllForWebsite
   * @description get all relevant data for a PostyBirb post
   */
  public getAllForWebsite(website: string): PostyBirbSubmissionData {
    const websiteData: any = this.websiteFields.find(website);
    const defaultData: any = this.getDefaultFields();

    const defaultDescription = defaultData.defaultDescription ? defaultData.defaultDescription.description : '';
    const customDescription = websiteData.description;

    let description = defaultDescription;
    let parseDescription = defaultData.defaultDescription ? !defaultData.defaultDescription.simple : true;
    if (customDescription && !customDescription.useDefault) { // Determine whether to use custom or default description
      description = customDescription.description;
      parseDescription = customDescription && !customDescription.useDefault ? !customDescription.simple : true;
    }

    const customTags = websiteData.tags;
    const overwriteTags: boolean = customTags && customTags.overwrite ? true : false;
    const defaultTags = overwriteTags ? [] : defaultData.defaultTags ? defaultData.defaultTags.tags : [];

    const submissionData: SubmissionData = {
      title: this.getTitle(),
      submissionFile: this.getSubmissionFile(),
      thumbnailFile: this.getThumbnailFile() || new FileInformation(null, false),
      additionalFiles: this.getAdditionalFilesFileInformation(),
      submissionRating: this.getSubmissionRating(),
      submissionType: this.getSubmissionType()
    };

    return {
      description,
      parseDescription,
      defaultTags,
      customTags: customTags && customTags.tags ? customTags.tags : [],
      options: Object.assign({}, websiteData.options),
      submissionData
    };
  }

  public setSubmissionFile(obj: FileInformation | FileObject): void {
    this.submissionFile = new FileWrapper(obj);
    this.emit();
  }

  public getSubmissionFile(): FileInformation {
    return this.submissionFile.getFileInformation();
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

  public getSubmissionFileSource(): Promise<string> {
    return this.submissionFile.getFileSrc();
  }

  public getSubmissionFileObject(): FileObject {
    return this.submissionFile.getFileObject();
  }

  public setAdditionalFiles(files: Array<FileInformation | FileObject> = []): void {
    this.additionalFiles = files.map(f => new FileWrapper(f));
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

  public getThumbnailFileSource(): Promise<string> {
    return this.thumbnailFile.getFileSrc();
  }

  public getThumbnailFileObject(): FileObject {
    return this.thumbnailFile.getFileObject();
  }

  public setThumbnailFile(obj: FileInformation | FileObject): void {
    this.thumbnailFile = new FileWrapper(obj);
    this.emit();
  }

  public getThumbnailFile(): FileInformation {
    return this.thumbnailFile.getFileInformation();
  }

  public getPreloadedThumbnailFile(): Promise<FileInformation> {
    return new Promise(function(resolve, reject) {
      if (this.thumbnailFile) {
        this.thumbnailFile.getFileInformationEnsureLoaded().then(fileInformation => resolve(fileInformation));
      } else {
        resolve(new FileInformation(null, false));
      }
    }.bind(this));
  }

  public setOrder(order: number): void {
    this.order = order;
    this.emit();
  }

  public getOrder(): number {
    return this.order;
  }

  public setId(id: string): void {
    if (id) {
      this.id = id;
    } else {
      this.id = PostyBirbSubmission.generateId();
    }

    this.emit();
  }

  public getId(): string {
    return this.id;
  }

  public setTitle(title: string): void {
    this.title = title;
    this.emit();
  }

  public getTitle(): string {
    return this.title;
  }

  public setSchedule(schedule: any): void {
    if (schedule) {
      this.schedule = new Date(schedule);
    } else {
      this.schedule = null;
    }

    this.emit();
  }

  public getSchedule(): Date {
    return this.schedule;
  }

  public isScheduled(): boolean {
    return Boolean(this.schedule);
  }

  public setSubmissionType(submissionType: string): void {
    this.submissionType = submissionType;
    this.emit();
  }

  public getSubmissionType(): string {
    return this.submissionType;
  }

  public setSubmissionRating(submissionRating: string): void {
    this.submissionRating = submissionRating;
    this.emit();
  }

  public getSubmissionRating(): string {
    return this.submissionRating;
  }

  public setSubmissionStatus(status: SubmissionStatus): void {
    this.submissionStatus = status;
  }

  public getSubmissionStatus(): SubmissionStatus {
    return this.submissionStatus;
  }

  public setUnpostedWebsites(websites: string[]): void {
    this.unpostedWebsites = websites || [];
    this.emit();
  }

  public getUnpostedWebsites(): string[] {
    return this.unpostedWebsites || [];
  }

  public getWebsiteFields(): object {
    return this.websiteFields.findAll();
  }

  public getWebsiteFieldFor(website: string): any {
    const data = this.websiteFields.find(website);
    if (data) {
      return JSON.parse(JSON.stringify(data));
    }

    return null;
  }

  public setWebsiteFields(websiteFields: object): void {
    const keys = Object.keys(websiteFields);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      this.websiteFields.update(key, websiteFields[key]);
    }
    this.emit();
  }

  public getDefaultFields(): object {
    return JSON.parse(JSON.stringify(this.defaultFields.findAll()));
  }

  public getDefaultFieldFor(key: string): any {
    return this.defaultFields.find(key);
  }

  public setDefaultFields(defaultFields: object): void {
    const keys = Object.keys(defaultFields);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      this.defaultFields.update(key, defaultFields[key]);
    }
    this.emit();
  }

  public static generateId(): string {
    return uniqid();
  }
}
