import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 3

export const stayService = {
    query,
    getById,
    remove,
    add,
    update,
    addStayReview,
    removeStayReview
}

// Helper function to get suggested stay range - returns Date objects like frontend util
function _getSuggestedStayRange(stay, nights = 5) {
    if (!stay.availableFrom || !stay.availableUntil) return null

    const from = new Date(stay.availableFrom)
    const until = new Date(stay.availableUntil)

    const totalDays = Math.floor((until - from) / (1000 * 60 * 60 * 24))
    if (totalDays <= nights) {
        return {
            start: from.toISOString(),
            end: until.toISOString()
        }
    }

    const offset = Math.floor(totalDays / 3)
    const start = new Date(from)
    start.setDate(start.getDate() + offset)
    const end = new Date(start)
    end.setDate(start.getDate() + nights)

    return {
        start: start.toISOString(),
        end: end.toISOString()
    }
}

async function query(filterBy = { txt: '', minPrice: 0 }) {
    try {
        const criteria = _buildCriteria(filterBy)
        const sort = _buildSort(filterBy)

        const collection = await dbService.getCollection('stay')
        let stayCursor = await collection.find(criteria, { sort })

        // Pagination
        if (filterBy.pageIdx !== undefined) {
            stayCursor = stayCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
        }

        const stays = await stayCursor.toArray()

        // Map stays like in local service
        const mappedStays = stays.map(stay => ({
            _id: stay._id,
            name: stay.name,
            type: stay.type,
            imgUrls: stay.imgUrls,
            price: stay.price,
            summary: stay.summary,
            capacity: stay.capacity || stay.guests || 0,
            bathrooms: stay.bathrooms,
            bedrooms: stay.bedrooms,
            beds: stay.beds,
            roomType: stay.roomType,
            availableFrom: stay.availableFrom,
            availableUntil: stay.availableUntil,
            host: stay.host,
            loc: stay.loc,
            reviews: stay.reviews || [],
            numReviews: stay.host?.numReviews || 0,
            likedByUsers: stay.likedByUsers || [],
            freeCancellation: Math.random() > 0.5,
            rating: stay.host?.rating ? +stay.host.rating : null,
            suggestedRange: _getSuggestedStayRange(stay)
        }))

        return mappedStays
    } catch (err) {
        logger.error('cannot find stays', err)
        throw err
    }
}

async function getById(stayId) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(stayId) }

        const collection = await dbService.getCollection('stay')
        const stay = await collection.findOne(criteria)

        if (!stay) throw `Stay ${stayId} not found`
        stay.createdAt = stay._id.getTimestamp()
        return stay
    } catch (err) {
        logger.error(`while finding stay ${stayId}`, err)
        throw err
    }
}

async function remove(stayId) {
    const { loggedinUser } = asyncLocalStorage.getStore()
    const { _id: ownerId, isAdmin } = loggedinUser || {}

    try {
        const criteria = { _id: ObjectId.createFromHexString(stayId) }
        if (!isAdmin) criteria['host._id'] = ownerId

        const collection = await dbService.getCollection('stay')
        const res = await collection.deleteOne(criteria)

        if (res.deletedCount === 0) throw 'Not your stay'
        return stayId
    } catch (err) {
        logger.error(`cannot remove stay ${stayId}`, err)
        throw err
    }
}

async function add(stay) {
    try {
        const collection = await dbService.getCollection('stay')
        await collection.insertOne(stay)
        return stay
    } catch (err) {
        logger.error('cannot insert stay', err)
        throw err
    }
}

async function update(stay) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(stay._id) }

        const toSet = {}
        const allowedKeys = ['name', 'summary', 'price', 'capacity', 'guests', 'bedrooms', 'beds', 'bathrooms', 'roomType', 'imgUrls', 'loc', 'amenities', 'type', 'availableFrom', 'availableUntil', 'host', 'reviews', 'likedByUsers']

        for (const key of allowedKeys) {
            if (stay[key] !== undefined) {
                toSet[key] = stay[key]
            }
        }

        const collection = await dbService.getCollection('stay')
        await collection.updateOne(criteria, { $set: toSet })
        return { ...stay, ...toSet }
    } catch (err) {
        logger.error(`cannot update stay ${stay._id}`, err)
        throw err
    }
}

async function addStayReview(stayId, reviewTxt) {
    try {
        const { loggedinUser } = asyncLocalStorage.getStore()
        if (!loggedinUser) throw 'User not logged in'

        const review = {
            id: makeId(),
            by: loggedinUser,
            txt: reviewTxt,
            createdAt: Date.now()
        }

        const criteria = { _id: ObjectId.createFromHexString(stayId) }

        const collection = await dbService.getCollection('stay')
        await collection.updateOne(criteria, { $push: { reviews: review } })

        return review
    } catch (err) {
        logger.error(`cannot add stay review ${stayId}`, err)
        throw err
    }
}

async function removeStayReview(stayId, reviewId) {
    try {
        const { loggedinUser } = asyncLocalStorage.getStore()
        const { _id: userId, isAdmin } = loggedinUser || {}

        const criteria = { _id: ObjectId.createFromHexString(stayId) }

        // IMPORTANT: Only remove review if user is admin or review owner
        if (!isAdmin) {
            criteria['reviews.by._id'] = userId
        }

        const collection = await dbService.getCollection('stay')
        const result = await collection.updateOne(
            criteria,
            { $pull: { reviews: { id: reviewId } } }
        )

        if (result.modifiedCount === 0) throw 'Review not found or not authorized'
        return reviewId
    } catch (err) {
        logger.error(`cannot remove stay review ${reviewId}`, err)
        throw err
    }
}

function _buildCriteria(filterBy) {
    const criteria = {}

    if (filterBy.txt) {
        const regex = new RegExp(filterBy.txt, 'i')
        criteria.$or = [
            { name: regex },
            { summary: regex },
            { 'loc.city': regex },
            { 'loc.country': regex },
            { 'loc.address': regex }
        ]
    }

    if (filterBy.minPrice) {
        criteria.price = { $gte: +filterBy.minPrice }
    }

    if (filterBy.type) {
        criteria.type = filterBy.type
    }

    if (filterBy.city) {
        criteria['loc.city'] = { $regex: filterBy.city, $options: 'i' }
    }

    if (filterBy.guests) {
    criteria.guests = { $gte: +filterBy.guests }
}

    return criteria
}

function _buildSort(filterBy) {
    if (!filterBy.sortField) return {}
    return { [filterBy.sortField]: filterBy.sortDir }
}