import { logger } from '../../services/logger.service.js'
import { stayService } from './stay.service.js'

export async function getStays(req, res) {
    try {
        const filterBy = {
            txt: req.query.txt || '',
            minPrice: +req.query.minPrice || 0,
            sortField: req.query.sortField || '',
            sortDir: +req.query.sortDir || 1,
            pageIdx: req.query.pageIdx,
            city: req.query.city || '',
            type: req.query.type || '',
            guests: +req.query.guests || 0,
        }

        const stays = await stayService.query(filterBy)
        res.json(stays)
    } catch (err) {
        logger.error('Failed to get stays', err)
        res.status(400).send({ err: 'Failed to get stays' })
    }
}

export async function getStayById(req, res) {
    try {
        const stayId = req.params.id
        const stay = await stayService.getById(stayId)
        res.json(stay)
    } catch (err) {
        logger.error('Failed to get stay', err)
        res.status(400).send({ err: 'Failed to get stay' })
    }
}

export async function addStay(req, res) {
    const { loggedinUser } = req
    const {
        name,
        type,
        summary = '',
        price,
        capacity,
        guests,
        imgUrls = [],
        loc = { city: '', country: '', address: '' },
        amenities = [],
        availableFrom = null,
        availableUntil = null
    } = req.body

    const stayCapacity = capacity || guests || 1

    if (price === undefined || price === null) {
        return res.status(400).send({ err: 'Price is required' })
    }

    const stay = {
        name: name || 'Untitled Stay',
        type: type || 'House',
        summary,
        price,
        capacity: stayCapacity,
        imgUrls,
        loc,
        amenities,
        availableFrom,
        availableUntil,
        host: {
            _id: loggedinUser._id,
            fullname: loggedinUser.fullname,
            imgUrl: loggedinUser.imgUrl
        },
        reviews: [],
        likedByUsers: []
    }

    try {
        const addedStay = await stayService.add(stay)
        res.json(addedStay)
    } catch (err) {
        logger.error('Failed to add stay', err)
        res.status(400).send({ err: 'Failed to add stay' })
    }
}

export async function updateStay(req, res) {
    const { loggedinUser } = req

    // Debug logging
    logger.info(`updateStay called - loggedinUser: ${JSON.stringify(loggedinUser)}`)
    const {
        _id,
        name,
        type,
        summary = '',
        price,
        capacity,
        guests,
        bedrooms,
        beds,
        bathrooms,
        roomType,
        imgUrls = [],
        loc = { city: '', country: '', address: '' },
        amenities = [],
        availableFrom = null,
        availableUntil = null,
        reviews = [],
        likedByUsers = []
    } = req.body

    // Validate price
    if (price === undefined || price === null) {
        return res.status(400).send({ err: 'Price is required' })
    }

    try {
        const existingStay = await stayService.getById(_id)

        logger.info(`Existing stay host: ${JSON.stringify(existingStay.host)}`)

        // Extract host ID - handle both string and ObjectId
        const existingHostId = existingStay.host._id?.toString() || existingStay.host._id
        const currentUserId = loggedinUser._id?.toString() || loggedinUser._id

        logger.info(`Comparing - existingHostId: ${existingHostId}, currentUserId: ${currentUserId}, isAdmin: ${loggedinUser.isAdmin}`)

        // Check authorization against existing stay's host
        if (!loggedinUser.isAdmin && existingHostId !== currentUserId) {
            logger.warn(`Authorization failed: existingHostId=${existingHostId}, currentUserId=${currentUserId}`)
            return res.status(403).send({ err: 'Not your stay' })
        }

        // Build updated stay object, preserving the original host
        const stay = {
            _id,
            name: name || 'Untitled Stay',
            type: type || 'House',
            summary,
            price,
            capacity: capacity || guests || 1,
            guests: guests || capacity || 1,
            bedrooms: bedrooms || 1,
            beds: beds || 1,
            bathrooms: bathrooms || 1,
            roomType: roomType || '',
            imgUrls,
            loc,
            amenities,
            availableFrom,
            availableUntil,
            host: existingStay.host, // Use existing host
            reviews,
            likedByUsers
        }

        const updatedStay = await stayService.update(stay)
        res.json(updatedStay)
    } catch (err) {
        logger.error(`Failed to update stay ${_id}`, err)
        res.status(400).send({ err: 'Failed to update stay' })
    }
}

export async function removeStay(req, res) {
    try {
        const stayId = req.params.id
        const removedId = await stayService.remove(stayId)
        res.send(removedId)
    } catch (err) {
        logger.error('Failed to remove stay', err)
        res.status(400).send({ err: 'Failed to remove stay' })
    }
}

export async function addStayReview(req, res) {
    try {
        const stayId = req.params.id
        const txt = req.body.txt

        const savedReview = await stayService.addStayReview(stayId, txt)
        res.json(savedReview)
    } catch (err) {
        logger.error('Failed to add stay review', err)
        res.status(400).send({ err: 'Failed to add stay review' })
    }
}

export async function removeStayReview(req, res) {
    try {
        const { id: stayId, reviewId } = req.params
        const removedId = await stayService.removeStayReview(stayId, reviewId)
        res.send(removedId)
    } catch (err) {
        logger.error('Failed to remove stay review', err)
        res.status(400).send({ err: 'Failed to remove stay review' })
    }
}