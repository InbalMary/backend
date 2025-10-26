import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import { 
    getWishlists, 
    getWishlistById, 
    addWishlist, 
    updateWishlist, 
    removeWishlist,
    addStayToWishlist,
    removeStayFromWishlist
} from './wishlist.controller.js'

const router = express.Router()

// Public routes - can query wishlists (with optional userId filter)
router.get('/', log, getWishlists)
router.get('/:id', log, getWishlistById)

// Protected routes - require authentication
router.post('/', log, requireAuth, addWishlist)
router.put('/:id', requireAuth, updateWishlist)
router.delete('/:id', requireAuth, removeWishlist)

// Stay management within wishlist - require authentication
router.post('/:id/stay', requireAuth, addStayToWishlist)
router.delete('/:id/stay/:stayId', requireAuth, removeStayFromWishlist)

export const wishlistRoutes = router