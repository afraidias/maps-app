import { Injectable } from '@angular/core';
import { MapService } from '.';
import { PlacesApiClient } from '../api';
import { Feature, PlacesResponse } from '../interfaces/places';

@Injectable({
  providedIn: 'root'
})
export class PlacesService {
  public userLocation?: [number, number];
  public isLoadingPlaces: boolean = false;
  public places: Feature[] = []; 
  
  get isUserLocationReady(): boolean {
    return !!this.userLocation;
  }
  
  constructor(
    private placesApi: PlacesApiClient,
    private mapService: MapService
  ) { 
    this.getUserLocation();
  }

  public async getUserLocation(): Promise<[number, number]> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(({coords}) =>  {
        this.userLocation = [coords.longitude, coords.latitude];
        resolve(this.userLocation);
      }, (err) => {
        alert('No se pudo obtener la geolocalización');
        console.log(err);
        reject();
      });
    })
  }
  
  getPlacesByQuery(query: string = '') {
    if (query.length === 0) {
      this.places = [];
      this.isLoadingPlaces = false;
      return;
    }
    if (!this.userLocation) throw new Error('It not userLocation');
    
    this.isLoadingPlaces = true;
    this.placesApi.get<PlacesResponse>(`/${query}.json`, {
      params: {
        proximity: this.userLocation.join(',')
      }
    })
      .subscribe(resp  => {
        this.isLoadingPlaces = false;
        this.places = resp.features;
        this.mapService.createMarkerFromPlaces(this.places, this.userLocation!);
      });
  }

  deletePlaces() {
    this.places = [];
  }

}
