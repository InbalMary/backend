import { logger } from '../../services/logger.service.js'
import { orderService } from './order.service.js'
import { ObjectId } from 'mongodb'

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
        res.status(200).json(orders)
    } catch (err) {
        logger.error('Failed to get orders', err)
        res.status(500).send({ err: 'server error' })
    }
}

export async function getOrderById(req, res) {
    try {
        const { id } = req.params
        if (!ObjectId.isValid(id)) return res.status(400).send({ err: 'id not valid' })

        const order = await orderService.getById(id, req.loggedinUser)
        if (!order) return res.status(404).send({ err: 'order not found' })

        res.status(200).json(order)
    } catch (err) {
        logger.error('Failed to get order', err)
        const status = err.message?.includes('Not authorized') ? 403 : 500
        res.status(status).send({ err: err.message || 'server error' })
    }
}

export async function addOrder(req, res) {
    const { loggedinUser, body } = req
    try {
        let guestId = loggedinUser._id
        try {
            guestId = ObjectId.createFromHexString(loggedinUser._id)
        } catch (err) {
            // string (localStorage)
        }

        const order = {
            host: body.host,
            guest: {
                _id: guestId,
                fullname: loggedinUser.fullname,
                imgUrl: body.guest?.imgUrl || loggedinUser.imgUrl || null
            },
            guestId: guestId,
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
        // console.log('Creating order with host:', order.host)
        const addedOrder = await orderService.add(order)
        res.status(201).json(addedOrder)
    } catch (err) {
        logger.error('Failed to add order', err)
        res.status(400).send({ err: err.message || 'bad data' })
    }
}

export async function updateOrder(req, res) {
    const { loggedinUser, body } = req
    try {
        const { id } = req.params
        if (!ObjectId.isValid(id)) return res.status(400).send({ err: 'bad id' })

        const order = { ...body, _id: id }
        const updatedOrder = await orderService.update(order, loggedinUser)
        if (!updatedOrder) return res.status(404).send({ err: 'order not found' })

        res.status(200).json(updatedOrder)
    } catch (err) {
        logger.error('Failed to update order', err)
        const status = err.message?.includes('Not authorized') ? 403 : 400
        res.status(status).send({ err: err.message || 'bad data' })
    }
}

export async function removeOrder(req, res) {
    try {
        const { id } = req.params
        if (!ObjectId.isValid(id)) return res.status(400).send({ err: 'bad id' })

        await orderService.remove(id, req.loggedinUser)
        res.status(204).end()
    } catch (err) {
        logger.error('Failed to remove order', err)
        const status = err.message?.includes('Not authorized') ? 403 : 500
        res.status(status).send({ err: err.message || 'server error' })
    }
}