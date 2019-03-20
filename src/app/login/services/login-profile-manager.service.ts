/**
 * This service keeps tracks of and manages login profiles in the application.
 */

import { Injectable } from '@angular/core';
import { LoginProfile } from '../interfaces/login-profile';
import * as nanoid from 'nanoid';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginProfileManagerService {
  private readonly PROFILE_FIELD: string = 'profiles';
  private db: any;

  private subject: BehaviorSubject<LoginProfile[]>;
  public readonly profileChanges: Observable<LoginProfile[]>; // Notifier for any profile changes

  private refreshSubject: Subject<LoginProfile[]>;
  public readonly triggerRefresh: Observable<LoginProfile[]>; // Notifier for any profile refresh request

  constructor() {
    this.subject = new BehaviorSubject([]);
    this.profileChanges = this.subject.asObservable();

    this.refreshSubject = new Subject();
    this.triggerRefresh = this.refreshSubject.asObservable();

    this.db = profilesDB;
    this.db.defaults({ [this.PROFILE_FIELD]: [] }).write();
    this._initialize();
  }

  /**
   * Load existing profiles objects into memory
   */
  private _initialize(): void {
    const profiles = this.db.get(this.PROFILE_FIELD).value() || [];

    // No profiles found (assume first initialize ever)
    if (!profiles.length) {
      this.createProfile('Default', true);
    } else {
      this._notifyAll();
    }
  }

  /**
   * Notifies all subscribers of profile changes
   */
  private _notifyAll(): void {
    this.subject.next(this.db.get(this.PROFILE_FIELD).sortBy('name').value());
  }

  private _unsetDefault(): void {
    this.db.get(this.PROFILE_FIELD)
      .find(({ defaultProfile: true }))
      .assign({ defaultProfile: false })
      .write();
  }

  /**
   * Updates a login profile
   * @param id   Id reference to the profile
   * @param name New name for the profile
   */
  public renameProfile(id: string, name: string): void {
    this.db.get(this.PROFILE_FIELD)
      .find({ id })
      .assign({ name })
      .write();

    this._notifyAll();
  }

  public makeDefaultProfile(id: string): void {
    this._unsetDefault();
    this.db.get(this.PROFILE_FIELD)
      .find({ id })
      .assign({ defaultProfile: true })
      .write();

    this._notifyAll();
  }

  /**
   * Deletes an existing login profile
   * @param id Id reference to the profile
   */
  public deleteProfile(id: string): void {
    const profile: LoginProfile = this.db.get(this.PROFILE_FIELD)
      .find({ id })
      .value();

    if (profile.defaultProfile) return;

    this.db.get(this.PROFILE_FIELD)
      .remove({ id })
      .write();

    const session = getSession(id);
    if (session) {
      session.clearCache(() => {
        console.info('DELETE: Cache cleared');
      });
      session.clearStorageData();
    }

    this._notifyAll();
  }

  /**
   * Inserts a new profile into the Profile DB if it doesn't exist already
   * @param name Name of the profile that will be displayed to the user
   * @param defaultProfile Whether or not the profile is to be the default one
   */
  public createProfile(name: string, defaultProfile: boolean): void {
    const existing: LoginProfile = this.db.get(this.PROFILE_FIELD).find({ name }).value();
    if (!existing) {
      if (defaultProfile) {
        this._unsetDefault();
      }

      this.db.get(this.PROFILE_FIELD)
        .push({
          id: nanoid(),
          name,
          defaultProfile,
          data: {}
        })
        .write();

      this._notifyAll();
    }
  }

  /**
   * @return Returns a list of all login profiles
   */
  public getAllProfiles(): LoginProfile[] {
    return this.db.get(this.PROFILE_FIELD).sortBy('name').value();
  }

  /**
   * Returns the user set default profile
   */
  public getDefaultProfile(): LoginProfile {
    return this.db.get(this.PROFILE_FIELD)
      .find({ defaultProfile: true })
      .value();
  }

  /**
   * Returns name of a given profile id
   * @param  id Profile reference Id
   * @return    Profile Name
   */
  public getProfileName(id: string): string {
    const profile = this.db.get(this.PROFILE_FIELD)
      .find({ id })
      .value();

    return profile ? profile.name : 'Profile does not exist';
  }

  /**
   * Gets miscellaneous data that is saved to a profile data variable
   * @param  id        Profile reference Id
   * @param  fieldName Field name to be retrieved
   */
  public getData(id: string, fieldName: string): any {
    const profile = this.db.get(this.PROFILE_FIELD)
      .find({ id })
      .value();

    if (profile) {
      if (profile.data) {
        return profile.data[fieldName];
      }
    }

    return null;
  }

  /**
   * Resets cookies and data tied to a login profile
   * @param id Profile reference Id
   */
  public resetProfile(id: string): void {
    const session = getSession(id);
    if (session) {
      session.clearCache(() => { });
      session.clearStorageData();
    }
    this.db.get(this.PROFILE_FIELD).find({ id }).assign({ data: {} }).write();

    this.refreshSubject.next([this.db.get(this.PROFILE_FIELD).find({ id }).value()]);
  }

  /**
   * Stores miscellaneous data that a website may require for login or other purposes.
   * @param id        Profile reference Id
   * @param fieldName Field name to be set in the data variable
   * @param data      Data to be saved
   */
  public storeData(id: string, fieldName: string, data: any): void {
    const profile = this.db.get(this.PROFILE_FIELD)
      .find({ id })
      .value();

    if (!profile.data) {
      profile.data = {};
    }

    profile.data[fieldName] = data;
    this.db.get(this.PROFILE_FIELD).find({ id }).assign({ data: profile.data }).write();
  }

}
