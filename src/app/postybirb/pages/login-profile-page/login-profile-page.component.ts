import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { MatDialog } from '@angular/material';
import { LoginProfile } from 'src/app/login/interfaces/login-profile';
import { Subscription } from 'rxjs';
import { InputDialog } from 'src/app/utils/components/input-dialog/input-dialog.component';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'login-profile-page',
  templateUrl: './login-profile-page.component.html',
  styleUrls: ['./login-profile-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginProfilePage implements OnInit, OnDestroy {
  private profileSubscription: Subscription = Subscription.EMPTY;
  public profiles: LoginProfile[] = [];

  constructor(private _loginManager: LoginProfileManagerService, private dialog: MatDialog, private _changeDetector: ChangeDetectorRef) {
    this.profileSubscription = this._loginManager.profileChanges.subscribe(profiles => {
      this.profiles = profiles;
      this._changeDetector.markForCheck();
    });
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.profileSubscription.unsubscribe();
  }

  public createNewLoginProfile(): void {
    this.dialog.open(InputDialog, {
      data: {
        title: 'New Profile',
        maxLength: 30,
        minLength: 2
      }
    }).afterClosed().subscribe(result => {
      if (result) {
        result = result.trim();
        if (result && result.length) {
          this._loginManager.createProfile(result, false);
        }
      }
    });
  }

  public renameProfile(profile: LoginProfile): void {
    this.dialog.open(InputDialog, {
      data: {
        title: 'Rename',
        maxLength: 30,
        minLength: 2,
        startingValue: profile.name
      }
    }).afterClosed().subscribe(result => {
      if (result) {
        result = result.trim();
        if (result && result.length) {
          this._loginManager.renameProfile(profile.id, result);
        }
      }
    });
  }

  public resetProfile(profile: LoginProfile): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Reset'
      }
    }).afterClosed()
      .subscribe(result => {
        if (result) {
          this._loginManager.resetProfile(profile.id);
        }
      });
  }

  public deleteProfile(profile: LoginProfile): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete'
      }
    }).afterClosed()
      .subscribe(result => {
        if (result) {
          this._loginManager.deleteProfile(profile.id);
        }
      });
  }

  public setDefault(profile: LoginProfile): void {
    this._loginManager.makeDefaultProfile(profile.id);
  }

}
