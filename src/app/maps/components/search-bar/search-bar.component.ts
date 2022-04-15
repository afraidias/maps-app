import { Component, OnInit } from '@angular/core';
import { PlacesService } from '../../services';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css']
})
export class SearchBarComponent implements OnInit {

  private debounceTimer?: NodeJS.Timeout;

  constructor(private placesService: PlacesService ) { }

  ngOnInit(): void {
  }

  onQueryChanged(txtQuery: string = '') {
    if(this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.placesService.getPlacesByQuery(txtQuery);
    }, 500);
  }

}
