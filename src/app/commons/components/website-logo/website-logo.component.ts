import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { WebLogo } from '../../enums/web-logo.enum';

@Component({
  selector: 'website-logo',
  templateUrl: './website-logo.component.html',
  styleUrls: ['./website-logo.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebsiteLogoComponent {
  @Input() website: string;
  @Input() height: string = '50px';
  @Input() width: string = '50px';

  public readonly webLogo: any = WebLogo;

}
