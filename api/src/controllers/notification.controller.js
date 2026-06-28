import { Notification } from '../models/notification.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** GET /api/notifications - as minhas (recentes) + contagem por ler. */
export const myNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(30);
  const naoLidas = await Notification.countDocuments({ user: req.user._id, lida: false });
  res.json({ success: true, naoLidas, count: notifications.length, notifications });
});

/** PATCH /api/notifications/ler-todas - marca todas como lidas. */
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, lida: false }, { lida: true });
  res.json({ success: true });
});

/** PATCH /api/notifications/:id/lida - marca uma como lida. */
export const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne(
    { _id: req.params.id, user: req.user._id },
    { lida: true }
  );
  res.json({ success: true });
});
