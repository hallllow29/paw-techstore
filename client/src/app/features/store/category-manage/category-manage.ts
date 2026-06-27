import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CategoryService } from '../../../core/services/category.service';
import { Category } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-category-manage',
  imports: [ReactiveFormsModule],
  templateUrl: './category-manage.html',
})
export class CategoryManage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categories = inject(CategoryService);

  readonly items = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly editId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    parent: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.categories.list().subscribe({
      next: (res) => {
        this.items.set(res.categories);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Nome da categoria-pai para mostrar na tabela. */
  parentNome(c: Category): string {
    if (!c.parent) return 'Raiz';
    if (typeof c.parent === 'string') {
      return this.items().find((x) => x._id === c.parent)?.nome ?? 'Raiz';
    }
    return c.parent.nome;
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.error.set(null);
    const v = this.form.getRawValue();
    const body = { nome: v.nome.trim(), parent: v.parent || null };
    const id = this.editId();
    const pedido = id ? this.categories.update(id, body) : this.categories.create(body);
    pedido.subscribe({
      next: () => {
        this.cancelar();
        this.load();
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Erro ao guardar a categoria'),
    });
  }

  editar(c: Category): void {
    this.editId.set(c._id);
    const parentId = c.parent ? (typeof c.parent === 'string' ? c.parent : c.parent._id) : '';
    this.form.setValue({ nome: c.nome, parent: parentId });
  }

  cancelar(): void {
    this.editId.set(null);
    this.form.reset({ nome: '', parent: '' });
  }

  remover(c: Category): void {
    if (!confirm(`Eliminar a categoria "${c.nome}"?`)) return;
    this.error.set(null);
    this.categories.remove(c._id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.message ?? 'Não foi possível remover a categoria'),
    });
  }
}
