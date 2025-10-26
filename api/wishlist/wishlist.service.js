import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

export const wishlistService = {
    query,
    getById,
    remove,
    add,
    update,
    addStayToWishlist,
    removeStayFromWishlist
}

async function query(filterBy = { userId: '' }) {
    try {
        const criteria = _buildCriteria(filterBy)

        const collection = await dbService.getCollection('wishlist')
        const wishlists = await collection.find(criteria).toArray()

        return wishlists
    } catch (err) {
        logger.error('cannot find wishlists', err)
        throw err
    }
}

async function getById(wishlistId) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(wishlistId) }

        const collection = await dbService.getCollection('wishlist')
        const wishlist = await collection.findOne(criteria)

        if (!wishlist) throw `Wishlist ${wishlistId} not found`
        wishlist.createdAt = wishlist._id.getTimestamp()
        return wishlist
    } catch (err) {
        logger.error(`while finding wishlist ${wishlistId}`, err)
        throw err
    }
}

async function remove(wishlistId) {
    const { loggedinUser } = asyncLocalStorage.getStore()
    const { _id: userId, isAdmin } = loggedinUser || {}

    try {
        const criteria = { _id: ObjectId.createFromHexString(wishlistId) }
        
        // Only owner or admin can remove
        if (!isAdmin) {
            criteria['byUser._id'] = userId
        }

        const collection = await dbService.getCollection('wishlist')
        const res = await collection.deleteOne(criteria)

        if (res.deletedCount === 0) throw 'Not your wishlist or wishlist not found'
        return wishlistId
    } catch (err) {
        logger.error(`cannot remove wishlist ${wishlistId}`, err)
        throw err
    }
}

async function add(wishlist) {
    try {
        const wishlistToAdd = {
            ...wishlist,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }

        const collection = await dbService.getCollection('wishlist')
        await collection.insertOne(wishlistToAdd)
        
        return wishlistToAdd
    } catch (err) {
        logger.error('cannot insert wishlist', err)
        throw err
    }
}

async function update(wishlist) {
    const { loggedinUser } = asyncLocalStorage.getStore()
    const { _id: userId, isAdmin } = loggedinUser || {}

    try {
        const criteria = { _id: ObjectId.createFromHexString(wishlist._id) }
        
        // Verify ownership
        const existingWishlist = await getById(wishlist._id)
        if (!isAdmin && existingWishlist.byUser._id !== userId) {
            throw 'Not your wishlist'
        }

        const wishlistToSave = {
            title: wishlist.title,
            stays: wishlist.stays,
            city: wishlist.city,
            country: wishlist.country,
            byUser: wishlist.byUser,
            updatedAt: Date.now()
        }

        const collection = await dbService.getCollection('wishlist')
        await collection.updateOne(criteria, { $set: wishlistToSave })
        
        return { ...wishlist, updatedAt: wishlistToSave.updatedAt }
    } catch (err) {
        logger.error(`cannot update wishlist ${wishlist._id}`, err)
        throw err
    }
}

async function addStayToWishlist(wishlistId, stayId) {
    const { loggedinUser } = asyncLocalStorage.getStore()
    const { _id: userId, isAdmin } = loggedinUser || {}

    try {
        const criteria = { _id: ObjectId.createFromHexString(wishlistId) }
        
        // Verify ownership
        const wishlist = await getById(wishlistId)
        if (!isAdmin && wishlist.byUser._id !== userId) {
            throw 'Not your wishlist'
        }

        // Check if stay already exists
        if (wishlist.stays.includes(stayId)) {
            throw 'Stay already in wishlist'
        }

        const collection = await dbService.getCollection('wishlist')
        await collection.updateOne(
            criteria,
            { 
                $push: { stays: stayId },
                $set: { updatedAt: Date.now() }
            }
        )

        return await getById(wishlistId)
    } catch (err) {
        logger.error(`cannot add stay to wishlist ${wishlistId}`, err)
        throw err
    }
}

async function removeStayFromWishlist(wishlistId, stayId) {
    const { loggedinUser } = asyncLocalStorage.getStore()
    const { _id: userId, isAdmin } = loggedinUser || {}

    try {
        const criteria = { _id: ObjectId.createFromHexString(wishlistId) }
        
        // Verify ownership
        const wishlist = await getById(wishlistId)
        if (!isAdmin && wishlist.byUser._id !== userId) {
            throw 'Not your wishlist'
        }

        const collection = await dbService.getCollection('wishlist')
        await collection.updateOne(
            criteria,
            { 
                $pull: { stays: stayId },
                $set: { updatedAt: Date.now() }
            }
        )

        return await getById(wishlistId)
    } catch (err) {
        logger.error(`cannot remove stay from wishlist ${wishlistId}`, err)
        throw err
    }
}

function _buildCriteria(filterBy) {
    const criteria = {}

    if (filterBy.userId) {
        criteria['byUser._id'] = filterBy.userId
    }

    return criteria
}