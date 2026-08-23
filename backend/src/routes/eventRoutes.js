const express = require('express');
const { receiveEvent, getEvents, getEventGroup } = require('../controllers/eventController');
const validateEvent = require('../middleware/validateEvent');

const router = express.Router();

router.post('/', validateEvent, receiveEvent);
router.get('/', getEvents);
router.get('/:eventId', getEventGroup);

module.exports = router;
