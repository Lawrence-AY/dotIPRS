const sessionService = require('../services/session.service');

async function create(req, res, next) {
  try {
    const session = await sessionService.createSession({
      username: req.body.username,
      password: req.body.password,
      clientId: req.body.clientId,
      clientSecret: req.body.clientSecret
    });

    return res.json({
      success: true,
      data: session,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { create };
