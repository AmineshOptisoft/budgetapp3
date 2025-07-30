// External dependencies
const healthpoint = require('healthpoint')
const bodyParser = require('body-parser')
const pinoLogger = require('express-pino-logger')
const cors = require('cors')()

// Internal dependencies
const db = require('./db')

// Constants
const { version } = require('../package.json')

// Module exports
const hp = healthpoint({ version }, db.healthCheck)

module.exports = {
  cors,
  health,
  logger: logger(),
  bodyParser: bodyParser.json({ limit: '5mb' })
}

// Functions
function logger () {
  return pinoLogger({
    level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    redact: [
      'res.headers["set-cookie"]',
      'req.headers.cookie',
      'req.headers.authorization'
    ]
  })
}

function health (req, res, next) {
  req.url === '/health' ? hp(req, res) : next()
}
