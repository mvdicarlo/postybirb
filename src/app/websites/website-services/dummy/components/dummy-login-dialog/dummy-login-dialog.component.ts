import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { LoginManagerService } from 'src/app/login/services/login-manager.service';
import { MAT_DIALOG_DATA } from '@angular/material';
import { GenericLoginDialogOptions } from 'src/app/websites/components/generic-login-dialog/generic-login-dialog.component';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { LoginStatus } from 'src/app/websites/interfaces/website-service.interface';

@Component({
  selector: 'dummy-login-dialog',
  templateUrl: './dummy-login-dialog.component.html',
  styleUrls: ['./dummy-login-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'login-dialog'
  }
})
export class DummyLoginDialog implements OnInit, AfterViewInit {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: GenericLoginDialogOptions,
  ) {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
  }
}
