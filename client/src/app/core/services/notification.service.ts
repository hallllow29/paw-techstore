import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Socket } from 'socket.io-client';
import { API_URL, API_ORIGIN, TOKEN_KEY } from '../config';
import { Notification } from '../models/notification.model';
import { ToastService } from './toast.service';

interface NotificationsResponse {
  success: boolean;
  naoLidas: number;
  notifications: Notification[];
}

const SOUND_KEY = 'paw_notif_som';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  readonly notifications = signal<Notification[]>([]);
  readonly naoLidas = signal(0);
  /** Última atualização de encomenda recebida em tempo real (id + estado). */
  readonly atualizacaoEncomenda = signal<{ id: string; estado: string; em: number } | null>(null);
  /** Som ligado/desligado (persiste em localStorage). */
  readonly som = signal(this.lerSom());

  private socket?: Socket;
  private aLigar = false;
  private audioCtx?: AudioContext;

  /** Carrega as notificações do utilizador autenticado. */
  carregar(): void {
    this.http.get<NotificationsResponse>(`${API_URL}/notifications`).subscribe((r) => {
      this.notifications.set(r.notifications);
      this.naoLidas.set(r.naoLidas);
    });
  }

  /**
   * Liga o canal em tempo real (sala pessoal do utilizador). O socket.io-client
   * é carregado dinamicamente para não pesar no bundle inicial - só após login.
   */
  async conectar(): Promise<void> {
    if (this.socket || this.aLigar) return;
    this.aLigar = true;
    try {
      const { io } = await import('socket.io-client');
      // Sessão pode ter terminado durante o import dinâmico
      if (!localStorage.getItem(TOKEN_KEY)) return;
      this.socket = io(API_ORIGIN, {
        auth: { token: localStorage.getItem(TOKEN_KEY) ?? '' },
      });
      this.socket.on('notificacao', (n: Notification) => this.receber(n));
      this.socket.on('order:update', (p: { id: string; estado: string }) =>
        this.atualizacaoEncomenda.set({ ...p, em: Date.now() }),
      );
    } finally {
      this.aLigar = false;
    }
  }

  /** Recebe uma notificação empurrada pelo servidor. */
  private receber(n: Notification): void {
    this.notifications.update((list) => [n, ...list.filter((x) => x._id !== n._id)].slice(0, 30));
    this.naoLidas.update((c) => c + 1);
    const novaEncomenda = n.tipo === 'encomenda';
    this.toast.show(`${n.titulo} - ${n.mensagem}`, novaEncomenda ? 'success' : 'info', 6000);
    this.tocarSom(novaEncomenda);
  }

  marcarLida(id: string): void {
    this.http.patch(`${API_URL}/notifications/${id}/lida`, {}).subscribe(() => {
      this.notifications.update((list) =>
        list.map((n) => (n._id === id ? { ...n, lida: true } : n)),
      );
      this.naoLidas.update((c) => Math.max(0, c - 1));
    });
  }

  marcarTodasLidas(): void {
    this.http.patch(`${API_URL}/notifications/ler-todas`, {}).subscribe(() => {
      this.notifications.update((list) => list.map((n) => ({ ...n, lida: true })));
      this.naoLidas.set(0);
    });
  }

  /** Liga/desliga o som das notificações. */
  alternarSom(): void {
    const novo = !this.som();
    this.som.set(novo);
    try {
      localStorage.setItem(SOUND_KEY, novo ? '1' : '0');
    } catch {
      /* armazenamento indisponível */
    }
    if (novo) this.tocarSom(false); // feedback imediato ao reativar
  }

  /** Limpa o estado local e desliga o socket (ex.: ao terminar sessão). */
  limpar(): void {
    this.notifications.set([]);
    this.naoLidas.set(0);
    this.socket?.disconnect();
    this.socket = undefined;
  }

  /** Toca um pequeno chime sintetizado (Web Audio). Best-effort. */
  private tocarSom(destaque: boolean): void {
    if (!this.som()) return;
    try {
      const Ctx =
        globalThis.AudioContext ??
        (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.audioCtx ??= new Ctx();
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') void ctx.resume();

      // Nova encomenda: duas notas (ding-dong); restantes: uma nota discreta
      const notas = destaque ? [784, 1046] : [660];
      for (const [i, freq] of notas.entries()) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t0 = ctx.currentTime + i * 0.16;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.36);
      }
    } catch {
      /* áudio indisponível - ignora */
    }
  }

  private lerSom(): boolean {
    try {
      return localStorage.getItem(SOUND_KEY) !== '0';
    } catch {
      return true;
    }
  }
}
