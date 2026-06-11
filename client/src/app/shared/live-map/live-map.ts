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
import { TrackingService } from '../../core/services/tracking.service';

interface NominatimResult {
  lat: string;
  lon: string;
}

/**
 * Mapa de rastreio em tempo real: mostra a morada de destino e o estafeta a
 * deslocar-se (posições recebidas via Socket.IO).
 */
@Component({
  selector: 'app-live-map',
  template: `<div #mapEl style="height: 280px; border-radius: 8px; overflow: hidden"></div>`,
})
export class LiveMap implements AfterViewInit, OnDestroy {
  readonly orderId = input.required<string>();
  readonly morada = input.required<string>();
  readonly posicaoInicial = input<{ lat: number; lng: number } | null>(null);

  private readonly http = inject(HttpClient);
  private readonly tracking = inject(TrackingService);
  private readonly mapEl = viewChild.required<ElementRef<HTMLElement>>('mapEl');

  private map?: L.Map;
  private estafetaMarker?: L.CircleMarker;

  ngAfterViewInit(): void {
    const q = encodeURIComponent(this.morada());
    this.http
      .get<
        NominatimResult[]
      >(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`)
      .subscribe({
        next: (r) => this.init(r[0]),
        error: () => this.init(undefined),
      });
  }

  private init(dest?: NominatimResult): void {
    const lat = dest ? Number(dest.lat) : 41.1496;
    const lng = dest ? Number(dest.lon) : -8.6109;

    this.map = L.map(this.mapEl().nativeElement).setView([lat, lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);

    // Marcador do destino
    L.circleMarker([lat, lng], { radius: 9, color: '#16a34a', fillOpacity: 0.6 })
      .addTo(this.map)
      .bindPopup('Destino');

    // Posição já conhecida (se houver)
    const inicial = this.posicaoInicial();
    if (inicial) this.atualizar(inicial.lat, inicial.lng);

    // Tempo real
    this.tracking.join(this.orderId());
    this.tracking.onPosicao((p) => this.atualizar(p.lat, p.lng));
  }

  private atualizar(lat: number, lng: number): void {
    if (!this.map) return;
    if (this.estafetaMarker) {
      this.estafetaMarker.setLatLng([lat, lng]);
    } else {
      this.estafetaMarker = L.circleMarker([lat, lng], {
        radius: 10,
        color: '#c2410c',
        fillColor: '#c2410c',
        fillOpacity: 0.85,
      })
        .addTo(this.map)
        .bindPopup('Estafeta');
    }
    this.map.panTo([lat, lng]);
  }

  ngOnDestroy(): void {
    this.tracking.off();
    this.map?.remove();
  }
}
