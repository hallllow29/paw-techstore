import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { TrackingService } from '../../../core/services/tracking.service';
import { Order, STATE_COLORS, STATE_LABELS } from '../../../core/models/order.model';
import { DeliveryMap } from '../../../shared/delivery-map/delivery-map';

@Component({
  selector: 'app-deliveries',
  imports: [DatePipe, DecimalPipe, DeliveryMap],
  templateUrl: './deliveries.html',
})
export class Deliveries implements OnInit {
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly tracking = inject(TrackingService);
  private readonly http = inject(HttpClient);

  readonly partilhando = signal<string | null>(null);
  private watchId?: number;

  // Estafeta ainda não aprovado pelo admin
  readonly contaPendente = computed(() => this.auth.user()?.status !== 'ativo');

  /** Partilha a localização real (GPS) durante a entrega. */
  partilhar(o: Order): void {
    if (!navigator.geolocation) {
      this.toast.error('Geolocalização não disponível neste dispositivo');
      return;
    }
    this.partilhando.set(o._id);
    this.toast.info('A partilhar a tua localização com o cliente');
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.tracking.sendPosicao(o._id, pos.coords.latitude, pos.coords.longitude),
      () => this.toast.error('Não foi possível obter a localização'),
      { enableHighAccuracy: true },
    );
  }

  pararPartilha(): void {
    if (this.watchId !== undefined) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = undefined;
    this.partilhando.set(null);
  }

  /** Simula um percurso até à morada (para a demo, já que o GPS do PC é estático). */
  simular(o: Order): void {
    const q = encodeURIComponent(this.morada(o));
    this.http
      .get<
        { lat: string; lon: string }[]
      >(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`)
      .subscribe((r) => {
        const destLat = r[0] ? Number(r[0].lat) : 41.1496;
        const destLng = r[0] ? Number(r[0].lon) : -8.6109;
        let lat = destLat - 0.012;
        let lng = destLng - 0.012;
        const passos = 25;
        let i = 0;
        this.partilhando.set(o._id);
        this.toast.info('A simular o percurso do estafeta…');
        const timer = setInterval(() => {
          i++;
          lat += (destLat - lat) / (passos - i + 1);
          lng += (destLng - lng) / (passos - i + 1);
          this.tracking.sendPosicao(o._id, lat, lng);
          if (i >= passos) {
            clearInterval(timer);
            this.partilhando.set(null);
          }
        }, 800);
      });
  }

  readonly disponiveis = signal<Order[]>([]);
  readonly minhas = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly mapaAberto = signal<string | null>(null);
  readonly labels = STATE_LABELS;
  readonly colors = STATE_COLORS;

  toggleMapa(id: string): void {
    this.mapaAberto.set(this.mapaAberto() === id ? null : id);
  }

  readonly emCurso = computed(() => this.minhas().some((o) => o.estado === 'em_entrega'));

  ngOnInit(): void {
    if (this.contaPendente()) this.loading.set(false);
    else this.load();
  }

  load(): void {
    this.loading.set(true);
    this.orders.available().subscribe((res) => this.disponiveis.set(res.orders));
    this.orders.myDeliveries().subscribe({
      next: (res) => {
        this.minhas.set(res.orders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  aceitar(o: Order): void {
    this.error.set(null);
    this.orders.accept(o._id).subscribe({
      next: () => {
        this.toast.success('Entrega aceite');
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Não foi possível aceitar';
        this.error.set(msg);
        this.toast.error(msg);
      },
    });
  }

  entregar(o: Order): void {
    this.orders.deliver(o._id).subscribe(() => {
      this.toast.success('Entrega concluída!');
      this.load();
    });
  }

  morada(o: Order): string {
    return typeof o.cliente === 'string' ? o.morada : o.cliente.morada || o.morada;
  }
  clienteNome(o: Order): string {
    return typeof o.cliente === 'string' ? '' : o.cliente.nome;
  }
}
