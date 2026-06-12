import mongoose from 'mongoose';

/** Notificação in-app para um utilizador (sino do header). */
const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tipo: { type: String, default: 'info' }, // info | encomenda | sistema
    titulo: { type: String, required: true, trim: true },
    mensagem: { type: String, default: '', trim: true },
    link: { type: String, default: '' }, // rota relativa do cliente (ex.: /encomendas/<id>)
    lida: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
