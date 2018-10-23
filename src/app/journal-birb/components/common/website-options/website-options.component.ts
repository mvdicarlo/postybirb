import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'website-options',
  templateUrl: './website-options.component.html',
  styleUrls: ['./website-options.component.css']
})
export class WebsiteOptionsComponent {
  public formGroup: FormGroup;
}
