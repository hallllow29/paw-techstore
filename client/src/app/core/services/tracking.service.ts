import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { API_ORIGIN, TOKEN_KEY } from '../config';

export interface Posicao {
  lat: number;
  lng: number;
  em: number;
}

/** Liga ao Socket.IO para rastreio em tempo real das entregas. */
@Injectable({ providedIn: 'root' })
export class TrackingService {
  private socket?: Socket;

  private connect(): Socket {
    this.socket ??= io(API_ORIGIN, {
      auth: { token: localStorage.getItem(TOKEN_KEY) ?? '' },
    });
    return this.socket;
  }

  /** Entrar na sala de uma encomenda para receber posições. */
  join(orderId: string): void {
    this.connect().emit('join', orderId);
  }

  /** Subscrever às atualizações de posição. */
  onPosicao(callback: (p: Posicao) => void): void {
    this.connect().on('posicao', callback);
  }

  /** Estafeta envia a sua posição. */
  sendPosicao(orderId: string, lat: number, lng: number): void {
    this.connect().emit('posicao', { orderId, lat, lng });
  }

  off(): void {
    this.socket?.off('posicao');
  }
}
