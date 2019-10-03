const mysql = require('../lib/mysql');

module.exports = function (fastify, opts, next) {
    fastify.get('/', { preValidation: [fastify.authenticate] }, async (req, res) => {
        res.view('./assets/index.html', { user: req.user[0] });
    });
    next();
};
