import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'description-help',
  templateUrl: './description-help.component.html',
  styleUrls: ['./description-help.component.css']
})
export class DescriptionHelpComponent implements OnInit {
  public toggle: boolean;

  constructor() { }

  ngOnInit() {
    this.toggle = true;
  }

  toggleHelp() {
    this.toggle = !this.toggle;
  }

}
