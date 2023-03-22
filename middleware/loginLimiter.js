const rateLimit = require('express-rate-limit')

const loginLimiter = rateLimit({
    windowsMs: 60 * 1000, // 1 minute
    max: 10,
    message: {
        message: 'Too many login attempts. Please try again in 60 seconds'
    },
    handler: (req, res, next, options) => {
        res.status(options.statusCode).send(options.message) 
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers 
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

module.exports = loginLimiter