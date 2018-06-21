import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'application-dashboard',
  templateUrl: './application-dashboard.component.html',
  styleUrls: ['./application-dashboard.component.css']
})
export class ApplicationDashboardComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {
  }

  public activate(route: string): void {
    this.router.navigateByUrl(route, { skipLocationChange: true });
  }

}
