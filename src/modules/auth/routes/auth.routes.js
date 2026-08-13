const express = require('express');
const controller = require('../controllers/session.controller');

const router = express.Router();

router.post('/session', controller.create);

module.exports = router;
