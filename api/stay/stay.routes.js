import express from 'express'
import { log } from '../../middlewares/logger.middleware.js'
import { getStays, getStayById, addStay, updateStay, removeStay, addStayReview, removeStayReview } from './stay.controller.js'

const router = express.Router()

// Public routes
router.get('/', log, getStays)
router.get('/:id', log, getStayById)

// Protected routes - auth checked in controller (like home.routes)
router.post('/', log, addStay)
router.put('/:id', log, updateStay)
router.delete('/:id', log, removeStay)

// Review routes
router.post('/:id/review', log, addStayReview)
router.delete('/:id/review/:reviewId', log, removeStayReview)

export const stayRoutes = router