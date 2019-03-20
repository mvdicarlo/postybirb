import { Component, OnInit, OnDestroy } from '@angular/core';
import { LoginProfileManagerService } from '../../services/login-profile-manager.service';
import { Subscription } from 'rxjs';
import { LoginProfile } from '../../interfaces/login-profile';
import { MatSelectChange, MatDialog } from '@angular/material';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';
import { InputDialog } from 'src/app/utils/components/input-dialog/input-dialog.component';
import { getDefaultProfile } from '../login-profile-select-dialog/login-profile-select-dialog.component';

@Component({
  selector: 'login-container',
  templateUrl: './login-container.component.html',
  styleUrls: ['./login-container.component.css']
})
export class LoginContainerComponent implements OnInit, OnDestroy {
  private profileSubscription: Subscription = Subscription.EMPTY;
  public profiles: LoginProfile[] = [];
  public defaultId: any;

  get selectedProfileId(): string { return this._selectedProfileId }
  set selectedProfileId(id: string) {
    this._selectedProfileId = id;
  }
  private _selectedProfileId: string;

  constructor(private _loginManager: LoginProfileManagerService, private dialog: MatDialog) { }

  ngOnInit() {
    this.profileSubscription = this._loginManager.profileChanges.subscribe(profiles => {
      this.profiles = profiles;
      this.defaultId = profiles.filter(p => p.defaultProfile)[0].id;

      // Select a default if none is selected yet
      if (!this.selectedProfileId) {
        this.selectedProfileId = (getDefaultProfile(this.profiles) || <any>{}).id;
      }
    });
  }

  ngOnDestroy() {
    this.profileSubscription.unsubscribe();
  }

  public updateProfileSelection(event: MatSelectChange): void {
    this.selectedProfileId = event.value;
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

  public renameLoginProfile(): void {
    this.dialog.open(InputDialog, {
      data: {
        title: 'Rename',
        maxLength: 30,
        minLength: 2,
        startingValue: (this.profiles.find(p => p.id === this.selectedProfileId) || <any>{}).name
      }
    }).afterClosed().subscribe(result => {
      if (result) {
        result = result.trim();
        if (result && result.length) {
          this._loginManager.renameProfile(this.selectedProfileId, result);
        }
      }
    });
  }

  public makeDefaultProfile(): void {
    this._loginManager.makeDefaultProfile(this.selectedProfileId);
  }

  public deleteLoginProfile(): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete'
      }
    }).afterClosed()
      .subscribe(result => {
        if (result) {
          const id: string = this.selectedProfileId;
          this.selectedProfileId = null;
          this._loginManager.deleteProfile(id);
        }
      });
  }

  public resetLoginProfile(): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Reset'
      }
    }).afterClosed()
      .subscribe(result => {
        if (result) {
          const id: string = this.selectedProfileId;
          this._loginManager.resetProfile(id);
        }
      });
  }

}
