import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import { 
    getOrders, 
    getOrderById, 
    addOrder, 
    updateOrder, 
    removeOrder 
} from './order.controller.js'

const router = express.Router()

router.get('/', log, requireAuth, getOrders)
router.get('/:id', log, requireAuth, getOrderById)
router.post('/', log, requireAuth, addOrder)
router.put('/:id', requireAuth, updateOrder)
router.delete('/:id', requireAuth, removeOrder)

export const orderRoutes = router