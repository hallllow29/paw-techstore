export interface Category {
  _id: string;
  nome: string;
  slug: string;
  parent?: Category | string | null;
  ativo: boolean;
}

export interface Product {
  _id: string;
  ean: string;
  nome: string;
  slug: string;
  descricao: string;
  categoria: Category | string;
  marca: string;
  preco: number;
  precoAntigo?: number | null;
  imagemDestaque: string;
  imagens: string[];
  stock: number;
  atributos: Record<string, string>;
  ativo: boolean;
  ratingMedia?: number;
  numAvaliacoes?: number;
  createdAt?: string;
}

export interface ProductReview {
  _id: string;
  produto: string;
  cliente: string;
  nome: string;
  rating: number;
  comentario: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ProductListResponse {
  success: boolean;
  products: Product[];
  pagination: Pagination;
}

export interface CompareResponse {
  success: boolean;
  products: Product[];
  attributeKeys: string[];
}

/** Parâmetros de pesquisa/filtro/ordenação/paginação da listagem. */
export interface ProductQuery {
  q?: string;
  categoria?: string;
  marca?: string;
  minPreco?: number;
  maxPreco?: number;
  emStock?: boolean;
  sort?: 'preco' | '-preco' | 'nome' | '-nome' | 'recentes';
  page?: number;
  limit?: number;
}
