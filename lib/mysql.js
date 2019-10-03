  const 
MySQL = require('mysql'),
config = require('../config.js'),
pool = MySQL.createPool(config.database),
Mysql = {
    Query: function (sql, props) {
        return new Promise(function (resolve, reject) {
            pool.getConnection(function (err, connection) {
                connection.query(
                    sql, props,
                    function (err, res) {
                        if (err) reject(err);
                        else resolve(res);
                    }
                );
                connection.release();
            });
        });
    }
};
module.exports = Mysql;