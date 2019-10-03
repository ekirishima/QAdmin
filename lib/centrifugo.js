const
    config = require("../config"),
    req = require("tiny_request"),
    Centrifugo = {
        Send: function (data) {
            return new Promise(function (resolve, reject) {
                req.post({ url: config.centrifugo.url.href, port: config.centrifugo.url.port, headers: {
                    'Authorization': 'apikey ' + config.centrifugo.apikey,
                    'Content-Type': 'application/json'
                }, jsonData: data}, function(body, response, err){
                    if(err) resolve({ centrifugo: 'error' });
                    else resolve({ centrifugo: 'true' });
                });
            });
        }
    };
module.exports = Centrifugo;