import { Directive, ViewContainerRef, ComponentFactoryResolver, Input, OnInit, Type } from '@angular/core';
import { WebsiteOptionsComponent } from '../components/common/website-options/website-options.component';

@Directive({
  selector: 'options-section'
})
export class OptionsSectionDirective implements OnInit {
  @Input() section: Type<WebsiteOptionsComponent>;

  public component: WebsiteOptionsComponent;

  constructor(public viewContainerRef: ViewContainerRef, private cfr: ComponentFactoryResolver) { }

  ngOnInit() {
    if (this.section) {
      this.component = (<WebsiteOptionsComponent>this.viewContainerRef.createComponent(this.cfr.resolveComponentFactory(this.section)).instance);
    }
  }

}
