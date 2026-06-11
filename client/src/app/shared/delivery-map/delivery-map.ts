import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

interface NominatimResult {
  lat: string;
  lon: string;
}

/**
 * Mostra a morada num mapa (OpenStreetMap via Leaflet).
 * Geocodifica o texto da morada com o Nominatim (gratuito, sem chave).
 */
@Component({
  selector: 'app-delivery-map',
  template: `<div #mapEl style="height: 200px; border-radius: 8px; overflow: hidden"></div>`,
})
export class DeliveryMap implements AfterViewInit, OnDestroy {
  readonly morada = input.required<string>();
  private readonly http = inject(HttpClient);
  private readonly mapEl = viewChild.required<ElementRef<HTMLElement>>('mapEl');
  private map?: L.Map;

  ngAfterViewInit(): void {
    const q = encodeURIComponent(this.morada());
    this.http
      .get<
        NominatimResult[]
      >(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`)
      .subscribe({
        next: (results) => this.render(results[0]),
        error: () => this.render(undefined),
      });
  }

  private render(result?: NominatimResult): void {
    // Fallback: centro do Porto se a geocodificação não devolver resultado
    const lat = result ? Number(result.lat) : 41.1496;
    const lon = result ? Number(result.lon) : -8.6109;

    this.map = L.map(this.mapEl().nativeElement).setView([lat, lon], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);
    L.circleMarker([lat, lon], { radius: 10, color: '#c2410c', fillOpacity: 0.5 })
      .addTo(this.map)
      .bindPopup(this.morada());
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
