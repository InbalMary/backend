import { logger } from '../../services/logger.service.js'
import { wishlistService } from './wishlist.service.js'

export async function getWishlists(req, res) {
    try {
        const filterBy = {
            userId: req.query.userId || (req.loggedinUser ? req.loggedinUser._id : ''),
        }

        const wishlists = await wishlistService.query(filterBy)
        res.json(wishlists)
    } catch (err) {
        logger.error('Failed to get wishlists', err)
        res.status(400).send({ err: 'Failed to get wishlists' })
    }
}

export async function getWishlistById(req, res) {
    try {
        const wishlistId = req.params.id
        const wishlist = await wishlistService.getById(wishlistId)
        
        if (req.loggedinUser) {
            if (wishlist.byUser._id !== req.loggedinUser._id && !req.loggedinUser.isAdmin) {
                return res.status(403).send({ err: 'Not authorized to view this wishlist' })
            }
        }
        
        res.json(wishlist)
    } catch (err) {
        logger.error('Failed to get wishlist', err)
        res.status(400).send({ err: 'Failed to get wishlist' })
    }
}

export async function addWishlist(req, res) {
    const { loggedinUser, body } = req

    const wishlist = {
        title: body.title || `Wishlist ${new Date().getFullYear()}`,
        byUser: {
            _id: loggedinUser._id,
            fullname: loggedinUser.fullname
        },
        stays: body.stays || [],
        city: body.city || '',
        country: body.country || '',
    }

    try {
        const addedWishlist = await wishlistService.add(wishlist)
        res.json(addedWishlist)
    } catch (err) {
        logger.error('Failed to add wishlist', err)
        res.status(400).send({ err: 'Failed to add wishlist' })
    }
}

export async function updateWishlist(req, res) {
    const { loggedinUser, body: wishlist } = req

    try {
        // Authorization is checked in service layer
        const updatedWishlist = await wishlistService.update(wishlist)
        res.json(updatedWishlist)
    } catch (err) {
        logger.error('Failed to update wishlist', err)
        const status = err.message?.includes('Not your wishlist') ? 403 : 400
        res.status(status).send({ err: err.message || 'Failed to update wishlist' })
    }
}

export async function removeWishlist(req, res) {
    try {
        const wishlistId = req.params.id
        const removedId = await wishlistService.remove(wishlistId)
        res.send(removedId)
    } catch (err) {
        logger.error('Failed to remove wishlist', err)
        const status = err.message?.includes('Not your wishlist') ? 403 : 400
        res.status(status).send({ err: err.message || 'Failed to remove wishlist' })
    }
}

export async function addStayToWishlist(req, res) {
    try {
        const wishlistId = req.params.id
        const { stayId } = req.body

        if (!stayId) {
            return res.status(400).send({ err: 'stayId is required' })
        }

        const updatedWishlist = await wishlistService.addStayToWishlist(wishlistId, stayId)
        res.json(updatedWishlist)
    } catch (err) {
        logger.error('Failed to add stay to wishlist', err)
        const status = err.message?.includes('Not your wishlist') ? 403 : 400
        res.status(status).send({ err: err.message || 'Failed to add stay to wishlist' })
    }
}

export async function removeStayFromWishlist(req, res) {
    try {
        const { id: wishlistId, stayId } = req.params
        const updatedWishlist = await wishlistService.removeStayFromWishlist(wishlistId, stayId)
        res.json(updatedWishlist)
    } catch (err) {
        logger.error('Failed to remove stay from wishlist', err)
        const status = err.message?.includes('Not your wishlist') ? 403 : 400
        res.status(status).send({ err: err.message || 'Failed to remove stay from wishlist' })
    }
}