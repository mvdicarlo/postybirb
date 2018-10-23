import { Component, OnInit, forwardRef } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { WebsiteOptionsComponent } from '../../common/website-options/website-options.component';

@Component({
  selector: 'tumblr-form',
  templateUrl: './tumblr-form.component.html',
  styleUrls: ['./tumblr-form.component.css'],
  providers: [{ provide: WebsiteOptionsComponent, useExisting: forwardRef(() => TumblrFormComponent) }],
})
export class TumblrFormComponent extends WebsiteOptionsComponent implements OnInit {

  constructor() {
    super();
  }

  ngOnInit() {
    this.formGroup = new FormGroup({
      blog: new FormControl()
    });
  }

}
