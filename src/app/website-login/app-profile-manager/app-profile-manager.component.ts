import { Component, OnInit } from '@angular/core';
import { MatSelectChange, MatDialog } from '@angular/material';
import { ProfileAddDialogComponent } from '../dialog/profile-add-dialog/profile-add-dialog.component';
import { ProfileRemoveDialogComponent } from '../dialog/profile-remove-dialog/profile-remove-dialog.component';

@Component({
  selector: 'app-profile-manager',
  templateUrl: './app-profile-manager.component.html',
  styleUrls: ['./app-profile-manager.component.css']
})
export class AppProfileManagerComponent implements OnInit {
  public appProfiles: string[] = [];

  constructor(private dialog: MatDialog) { }

  ngOnInit() {
    this.appProfiles = getAppProfiles();
  }

  public async profileChosen(event: MatSelectChange) {
    addOrOpenAppProfile(event.value);
  }

  public async openAddProfileDialog() {
    const dialogRef = this.dialog.open(ProfileAddDialogComponent);
    dialogRef.afterClosed().subscribe(profile => {
      if (profile) {
        addOrOpenAppProfile(profile);
        this.appProfiles.push(profile);
        this.appProfiles = this.appProfiles.sort();
      }
    });
  }

  public async openDeleteProfileDialog() {
    const dialogRef = this.dialog.open(ProfileRemoveDialogComponent);
    dialogRef.afterClosed().subscribe(profile => {
      if (profile) {
        removeAppProfile(profile);
        const index: number = this.appProfiles.indexOf(profile);
        if (index !== -1) {
          this.appProfiles.splice(index, 1);
        }
      }
    });
  }

}
