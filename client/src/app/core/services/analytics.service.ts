import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { Bucket } from '../series';

export interface Distrib {
  _id: string | null;
  total: number;
}

export interface TopProduto {
  _id: string;
  quantidade: number;
}

export interface ResumoEncomenda {
  _id: string;
  total: number;
  estado: string;
  createdAt: string;
  cliente?: { _id: string; nome: string } | null;
}

export interface ResumoUtilizador {
  _id: string;
  nome: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  avatar?: string;
}

export interface AdminStats {
  success: boolean;
  kpis: {
    totalUtilizadores: number;
    totalEncomendas: number;
    totalProdutos: number;
    receita: number;
    receita30: number;
  };
  porRole: Distrib[];
  porStatus: Distrib[];
  porEstado: Distrib[];
  tendencia: Bucket[];
  novosUtilizadores: Bucket[];
  topProdutos: TopProduto[];
  ultimasEncomendas: ResumoEncomenda[];
  ultimosUtilizadores: ResumoUtilizador[];
}

export interface ProdutoStock {
  _id: string;
  nome: string;
  stock: number;
  slug: string;
  preco: number;
  imagemDestaque?: string;
}

export interface LojaAnalytics {
  success: boolean;
  kpis: {
    totalEncomendas: number;
    totalProdutos: number;
    totalClientes: number;
    receita: number;
    receita30: number;
    ticketMedio: number;
    stockBaixo: number;
  };
  porEstado: Distrib[];
  tendencia: Bucket[];
  topProdutos: TopProduto[];
  stockBaixoLista: ProdutoStock[];
  porPagamento: Distrib[];
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);

  admin(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${API_URL}/analytics/admin`);
  }

  loja(): Observable<LojaAnalytics> {
    return this.http.get<LojaAnalytics>(`${API_URL}/analytics/loja`);
  }
}
