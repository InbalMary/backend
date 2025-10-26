import { logger } from '../../services/logger.service.js'
import { orderService } from './order.service.js'

export async function getOrders(req, res) {
    try {
        const filterBy = {
            hostId: req.query.hostId || '',
            guestId: req.query.guestId || '',
            status: req.query.status || '',
            startDate: req.query.startDate || '',
            endDate: req.query.endDate || '',
            stayId: req.query.stayId || '',
            totalPriceMin: +req.query.totalPriceMin || 0,
            totalPriceMax: +req.query.totalPriceMax || 0,
        }

        const orders = await orderService.query(filterBy, req.loggedinUser)
        res.json(orders)
    } catch (err) {
        logger.error('Failed to get orders', err)
        res.status(400).send({ err: 'Failed to get orders' })
    }
}

export async function getOrderById(req, res) {
    try {
        const orderId = req.params.id
        const order = await orderService.getById(orderId, req.loggedinUser)
        res.json(order)
    } catch (err) {
        logger.error('Failed to get order', err)
        res.status(400).send({ err: 'Failed to get order' })
    }
}

export async function addOrder(req, res) {
    const { loggedinUser, body } = req

    const order = {
        host: body.host,
        guest: {
            _id: loggedinUser._id,
            fullname: loggedinUser.fullname,
            imgUrl: loggedinUser.imgUrl
        },
        totalPrice: body.totalPrice,
        pricePerNight: body.pricePerNight,
        cleaningFee: body.cleaningFee || 0,
        serviceFee: body.serviceFee || 0,
        numNights: body.numNights,
        startDate: body.startDate,
        endDate: body.endDate,
        guests: body.guests,
        stay: body.stay,
        msgs: body.msgs || [],
        status: 'pending',
        bookedAt: new Date().toISOString().split('T')[0]
    }

    try {
        const addedOrder = await orderService.add(order)
        res.json(addedOrder)
    } catch (err) {
        logger.error('Failed to add order', err)
        res.status(400).send({ err: 'Failed to add order' })
    }
}

export async function updateOrder(req, res) {
    const { loggedinUser, body: order } = req
    const { _id: userId, isAdmin } = loggedinUser

    try {
        // Verify authorization in service
        const updatedOrder = await orderService.update(order, loggedinUser)
        // console.log('Order updated successfully')
        res.json(updatedOrder)
    } catch (err) {
        // console.error('Update failed:', err.message)
        logger.error('Failed to update order', err)
        const status = err.message?.includes('Not authorized') ? 403 : 400
        res.status(status).send({ err: err.message || 'Failed to update order' })
    }
}

export async function removeOrder(req, res) {
    try {
        const orderId = req.params.id
        const removedId = await orderService.remove(orderId, req.loggedinUser)
        res.send(removedId)
    } catch (err) {
        logger.error('Failed to remove order', err)
        const status = err.message?.includes('Not authorized') ? 403 : 400
        res.status(status).send({ err: err.message || 'Failed to remove order' })
    }
}