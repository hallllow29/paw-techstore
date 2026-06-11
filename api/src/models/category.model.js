import mongoose from 'mongoose';
import { slugify } from '../utils/slugify.js';

/**
 * @openapi
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         nome: { type: string }
 *         slug: { type: string }
 *         parent: { type: string, nullable: true, description: ID da categoria-mãe }
 *         ativo: { type: boolean }
 */
const categorySchema = new mongoose.Schema(
  {
    nome: { type: String, required: [true, 'O nome é obrigatório'], trim: true },
    slug: { type: String, unique: true, index: true },
    // null = categoria de topo; senão aponta para a categoria-mãe (hierarquia)
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Gera o slug a partir do nome antes de validar
categorySchema.pre('validate', function setSlug(next) {
  if (this.isModified('nome') || !this.slug) {
    this.slug = slugify(this.nome);
  }
  next();
});

/**
 * Devolve o id pedido + os de todas as subcategorias (em qualquer nível).
 * Permite que filtrar por "Computadores" inclua "Portáteis" e "Desktop".
 */
categorySchema.statics.descendantIds = async function descendantIds(id) {
  const all = await this.find({}, '_id parent').lean();
  const childrenOf = new Map();
  for (const c of all) {
    const p = c.parent ? String(c.parent) : 'root';
    if (!childrenOf.has(p)) childrenOf.set(p, []);
    childrenOf.get(p).push(String(c._id));
  }

  const result = [];
  const stack = [String(id)];
  while (stack.length > 0) {
    const current = stack.pop();
    result.push(current);
    stack.push(...(childrenOf.get(current) ?? []));
  }
  return result;
};

export const Category = mongoose.model('Category', categorySchema);
