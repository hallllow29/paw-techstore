import mongoose from 'mongoose';
import { slugify } from '../utils/slugify.js';

/**
 * @openapi
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         ean: { type: string }
 *         nome: { type: string }
 *         slug: { type: string }
 *         descricao: { type: string }
 *         categoria: { type: string, description: ID da categoria }
 *         marca: { type: string }
 *         preco: { type: number }
 *         precoAntigo: { type: number, nullable: true }
 *         imagemDestaque: { type: string }
 *         imagens: { type: array, items: { type: string } }
 *         stock: { type: integer }
 *         atributos: { type: object, additionalProperties: { type: string } }
 *         ativo: { type: boolean }
 */
const productSchema = new mongoose.Schema(
  {
    ean: {
      type: String,
      required: [true, 'O EAN é obrigatório'],
      unique: true,
      trim: true,
      index: true,
    },
    nome: {
      type: String,
      required: [true, 'O nome é obrigatório'],
      trim: true,
      index: true,
    },
    slug: { type: String, unique: true, index: true },
    descricao: { type: String, default: '', trim: true },
    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'A categoria é obrigatória'],
      index: true,
    },
    marca: { type: String, default: '', trim: true },
    preco: { type: Number, required: [true, 'O preço é obrigatório'], min: 0 },
    // Preço anterior (opcional) para mostrar desconto
    precoAntigo: { type: Number, min: 0, default: null },
    imagemDestaque: { type: String, default: '' },
    imagens: { type: [String], default: [] },
    stock: { type: Number, default: 0, min: 0 },
    // Especificações livres (RAM, CPU, polegadas...) que alimentam o comparador
    atributos: { type: Map, of: String, default: {} },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Índice de texto para pesquisa por nome/descrição/marca
productSchema.index({ nome: 'text', descricao: 'text', marca: 'text' });

productSchema.pre('validate', function setSlug(next) {
  if (this.isModified('nome') || !this.slug) {
    // inclui parte do EAN para garantir unicidade entre produtos com nome igual
    this.slug = `${slugify(this.nome)}-${String(this.ean).slice(-4)}`;
  }
  next();
});

export const Product = mongoose.model('Product', productSchema);
