import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['cliente', 'loja', 'estafeta', 'admin'];
export const USER_STATUS = ['ativo', 'pendente', 'rejeitado', 'banido'];

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         nome: { type: string }
 *         email: { type: string, format: email }
 *         morada: { type: string }
 *         telefone: { type: string }
 *         role: { type: string, enum: [cliente, loja, estafeta, admin] }
 *         status: { type: string, enum: [ativo, pendente, rejeitado, banido] }
 *         createdAt: { type: string, format: date-time }
 */
const userSchema = new mongoose.Schema(
  {
    nome: { type: String, required: [true, 'O nome é obrigatório'], trim: true },
    email: {
      type: String,
      required: [true, 'O email é obrigatório'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
    password: {
      type: String,
      required: [true, 'A password é obrigatória'],
      minlength: [6, 'A password deve ter pelo menos 6 caracteres'],
      select: false, // nunca devolvido por defeito nas queries
    },
    morada: { type: String, required: [true, 'A morada é obrigatória'], trim: true },
    telefone: { type: String, required: [true, 'O telefone é obrigatório'], trim: true },
    role: { type: String, enum: ROLES, default: 'cliente' },
    // Estafetas entram 'pendente' até o admin aprovar; restantes 'ativo'
    status: { type: String, enum: USER_STATUS, default: 'ativo' },
    // Produtos marcados como favoritos (wishlist)
    favoritos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    // Moradas de entrega guardadas (além da morada principal)
    moradas: [{ type: String, trim: true }],
    // Foto de perfil (caminho servido em /uploads)
    avatar: { type: String, default: '' },
    // Confirmação de email (link enviado no registo). Token guardado como hash.
    emailVerificado: { type: Boolean, default: false },
    emailTokenHash: { type: String, select: false },
    emailTokenExpiresAt: { type: Date, select: false },
    // Login por código no email (OTP) — alternativa à password, só para clientes
    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    otpPurpose: { type: String, select: false }, // 'login' | 'reset'
  },
  { timestamps: true }
);

// Hash da password antes de gravar (só quando muda)
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compara uma password em claro com o hash guardado
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Garante que a password e os campos de OTP nunca saem em respostas JSON
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.otpHash;
    delete ret.otpExpiresAt;
    delete ret.otpAttempts;
    delete ret.otpPurpose;
    delete ret.emailTokenHash;
    delete ret.emailTokenExpiresAt;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
