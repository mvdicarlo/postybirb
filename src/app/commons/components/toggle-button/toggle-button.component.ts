import { Component, Input } from '@angular/core';

@Component({
  selector: 'toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.css']
})
/**
 * Component used to toggle information with a button
 */
export class ToggleButtonComponent {
  @Input() onLabel: string; //label showed when toggled = true
  @Input() offLabel: string; //label shown when toggled = false
  @Input() color?: string = 'accent'; //Material color type

  public toggled: boolean = false;

  public toggle() {
    this.toggled = !this.toggled;
  }

}
