import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'website-status',
  templateUrl: './website-status.component.html',
  styleUrls: ['./website-status.component.css']
})
export class WebsiteStatusComponent implements OnChanges {
  @Input() info: any;

  constructor() { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes) {
      this.info = changes.info.currentValue;
    }
  }

}
