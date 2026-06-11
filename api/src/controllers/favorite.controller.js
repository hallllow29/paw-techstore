import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** GET /api/favorites — produtos favoritos do utilizador. */
export const listFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'favoritos',
    populate: { path: 'categoria', select: 'nome slug' },
  });
  res.json({ success: true, favoritos: user.favoritos });
});

/** POST /api/favorites/:productId — adiciona/remove dos favoritos (toggle). */
export const toggleFavorite = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const user = await User.findById(req.user._id);

  const idx = user.favoritos.findIndex((p) => String(p) === productId);
  if (idx >= 0) user.favoritos.splice(idx, 1);
  else user.favoritos.push(productId);
  await user.save();

  res.json({ success: true, favoritos: user.favoritos.map(String) });
});
