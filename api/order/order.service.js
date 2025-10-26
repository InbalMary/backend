import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { dbService } from '../../services/db.service.js'

export const orderService = {
    query,
    getById,
    remove,
    add,
    update
}

async function query(filterBy = {}, loggedinUser) {
    try {
        const criteria = _buildCriteria(filterBy, loggedinUser)

        const collection = await dbService.getCollection('order')
        const orders = await collection.find(criteria).toArray()

        // Remove sensitive data and convert ObjectIds to strings
        orders.forEach(order => {
            if (order.host?.password) delete order.host.password
            if (order.guest?.password) delete order.guest.password

            // Convert ObjectIds to strings for client
            if (order.host?._id) order.host._id = order.host._id.toString()
            if (order.guest?._id) order.guest._id = order.guest._id.toString()
        })

        return orders
    } catch (err) {
        logger.error('cannot find orders', err)
        throw err
    }
}

async function getById(orderId, loggedinUser) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(orderId) }

        const collection = await dbService.getCollection('order')
        const order = await collection.findOne(criteria)

        if (!order) throw `Order ${orderId} not found`

        // Verify user is either the guest or the host
        const { _id: userId, isAdmin } = loggedinUser || {}
        const userObjectId = ObjectId.createFromHexString(userId)

        const isGuest = order.guest._id.equals(userObjectId)
        const isHost = order.host._id.equals(userObjectId)

        if (!isAdmin && !isGuest && !isHost) {
            throw 'Not authorized to view this order'
        }

        // Remove sensitive data
        if (order.host?.password) delete order.host.password
        if (order.guest?.password) delete order.guest.password

        // Convert ObjectIds to strings for client
        if (order.host?._id) order.host._id = order.host._id.toString()
        if (order.guest?._id) order.guest._id = order.guest._id.toString()

        order.createdAt = order._id.getTimestamp()
        return order
    } catch (err) {
        logger.error(`while finding order ${orderId}`, err)
        throw err
    }
}

async function remove(orderId, loggedinUser) {
    const { _id: userId, isAdmin } = loggedinUser || {}

    try {
        const criteria = { _id: ObjectId.createFromHexString(orderId) }

        // Only guest or admin can remove order
        if (!isAdmin) {
            const userObjectId = ObjectId.createFromHexString(userId)
            criteria['guest._id'] = userObjectId
        }

        const collection = await dbService.getCollection('order')
        const res = await collection.deleteOne(criteria)

        if (res.deletedCount === 0) throw 'Not authorized to remove this order'
        return orderId
    } catch (err) {
        logger.error(`cannot remove order ${orderId}`, err)
        throw err
    }
}

async function add(order) {
    try {
        // Remove sensitive data before saving
        if (order.host?.password) delete order.host.password
        if (order.guest?.password) delete order.guest.password

        const collection = await dbService.getCollection('order')
        await collection.insertOne(order)
        return order
    } catch (err) {
        logger.error('cannot insert order', err)
        throw err
    }
}

async function update(order, loggedinUser) {
    const { _id: userId, isAdmin } = loggedinUser || {}

    try {
        const criteria = { _id: ObjectId.createFromHexString(order._id) }

        // Get existing order to check authorization
        const collection = await dbService.getCollection('order')
        const existingOrder = await collection.findOne(criteria)

        if (!existingOrder) throw 'Order not found'

        // Guest can update their order, host can update status
        const userObjectId = ObjectId.createFromHexString(userId)
        const isGuest = existingOrder.guest._id.equals(userObjectId)
        const isHost = existingOrder.host._id.equals(userObjectId)

        if (!isAdmin && !isGuest && !isHost) {
            throw 'Not authorized to update this order'
        }

        // convert IDs from string to ObjectId
        const normalizedHost = {
            ...order.host,
            _id: typeof order.host._id === 'string'
                ? ObjectId.createFromHexString(order.host._id)
                : order.host._id
        }

        const normalizedGuest = {
            ...order.guest,
            _id: typeof order.guest._id === 'string'
                ? ObjectId.createFromHexString(order.guest._id)
                : order.guest._id
        }

        // Remove sensitive data
        if (normalizedHost.password) delete normalizedHost.password
        if (normalizedGuest.password) delete normalizedGuest.password

        const orderToSave = {
            host: normalizedHost,
            guest: normalizedGuest,
            totalPrice: order.totalPrice,
            pricePerNight: order.pricePerNight,
            cleaningFee: order.cleaningFee,
            serviceFee: order.serviceFee,
            numNights: order.numNights,
            startDate: order.startDate,
            endDate: order.endDate,
            guests: order.guests,
            stay: order.stay,
            msgs: order.msgs || [],
            status: order.status,
            bookedAt: order.bookedAt
        }

        await collection.updateOne(criteria, { $set: orderToSave })

        // Return order with string IDs for client
        const updatedOrder = {
            ...order,
            host: { ...order.host, _id: order.host._id.toString() },
            guest: { ...order.guest, _id: order.guest._id.toString() }
        }

        return updatedOrder
    } catch (err) {
        logger.error(`cannot update order ${order._id}`, err)
        throw err
    }
}

function _buildCriteria(filterBy, loggedinUser) {
    const criteria = {}
    const { _id: userId, isAdmin } = loggedinUser || {}

    // Users can only see their own orders (as guest or host) unless admin
    if (!isAdmin && userId) {
        const userObjectId = ObjectId.createFromHexString(userId)

        criteria.$or = [
            { 'guest._id': userObjectId },
            { 'host._id': userObjectId }
        ]
    }

    if (filterBy.hostId) {
        criteria['host._id'] = ObjectId.createFromHexString(filterBy.hostId)
    }

    if (filterBy.guestId) {
        criteria['guest._id'] = ObjectId.createFromHexString(filterBy.guestId)
    }

    if (filterBy.status) {
        criteria.status = filterBy.status
    }

    if (filterBy.stayId) {
        criteria['stay._id'] = filterBy.stayId
    }

    if (filterBy.totalPriceMin) {
        criteria.totalPrice = { ...criteria.totalPrice, $gte: +filterBy.totalPriceMin }
    }

    if (filterBy.totalPriceMax) {
        criteria.totalPrice = { ...criteria.totalPrice, $lte: +filterBy.totalPriceMax }
    }

    if (filterBy.startDate) {
        criteria.startDate = { $gte: filterBy.startDate }
    }

    if (filterBy.endDate) {
        criteria.endDate = { $lte: filterBy.endDate }
    }

    return criteria
}