import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { Category } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.html',
})
export class ProductForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly products = inject(ProductService);
  private readonly categoriesSvc = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly editId = signal<string | null>(null);

  private destaqueFile: File | null = null;
  private imagensFiles: File[] = [];

  readonly form = this.fb.nonNullable.group({
    ean: ['', Validators.required],
    nome: ['', Validators.required],
    marca: [''],
    categoria: ['', Validators.required],
    preco: [0, [Validators.required, Validators.min(0)]],
    precoAntigo: [null as number | null],
    stock: [0, [Validators.min(0)]],
    descricao: [''],
    atributos: this.fb.array<ReturnType<ProductForm['novoAtributo']>>([]),
  });

  get atributos(): FormArray {
    return this.form.get('atributos') as FormArray;
  }

  ngOnInit(): void {
    this.categoriesSvc.list().subscribe((res) => this.categories.set(res.categories));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      this.products.get(id).subscribe(({ product }) => {
        this.form.patchValue({
          ean: product.ean,
          nome: product.nome,
          marca: product.marca,
          categoria:
            typeof product.categoria === 'string' ? product.categoria : product.categoria._id,
          preco: product.preco,
          precoAntigo: product.precoAntigo ?? null,
          stock: product.stock,
          descricao: product.descricao,
        });
        for (const [chave, valor] of Object.entries(product.atributos ?? {})) {
          this.atributos.push(this.novoAtributo(chave, valor));
        }
      });
    } else {
      this.addAtributo();
    }
  }

  novoAtributo(chave = '', valor = '') {
    return this.fb.nonNullable.group({ chave: [chave], valor: [valor] });
  }

  addAtributo(): void {
    this.atributos.push(this.novoAtributo());
  }

  removeAtributo(i: number): void {
    this.atributos.removeAt(i);
  }

  onDestaque(event: Event): void {
    this.destaqueFile = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  onImagens(event: Event): void {
    this.imagensFiles = Array.from((event.target as HTMLInputElement).files ?? []);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    const fd = new FormData();
    fd.append('ean', v.ean);
    fd.append('nome', v.nome);
    fd.append('marca', v.marca);
    fd.append('categoria', v.categoria);
    fd.append('preco', String(v.preco));
    fd.append('stock', String(v.stock));
    fd.append('descricao', v.descricao);
    if (v.precoAntigo) fd.append('precoAntigo', String(v.precoAntigo));

    const atributos: Record<string, string> = {};
    for (const a of v.atributos as { chave: string; valor: string }[]) {
      if (a.chave.trim()) atributos[a.chave.trim()] = a.valor;
    }
    fd.append('atributos', JSON.stringify(atributos));

    if (this.destaqueFile) fd.append('imagemDestaque', this.destaqueFile);
    for (const f of this.imagensFiles) fd.append('imagens', f);

    const id = this.editId();
    const req$ = id ? this.products.update(id, fd) : this.products.create(fd);
    req$.subscribe({
      next: () => this.router.navigate(['/loja/produtos']),
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Erro ao guardar');
        this.loading.set(false);
      },
    });
  }
}
