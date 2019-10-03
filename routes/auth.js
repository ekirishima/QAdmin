const 
config = require('../config'), 
mysql = require('../lib/mysql');
r = require('tiny_request'); 

module.exports = function (fastify, opts, next) {
    fastify.get('/', (req, res) => res.redirect('https://oauth.vk.com/authorize?client_id='+ config.vk.id +'&display=mobile&redirect_uri='+ config.vk.redirect +'&response_type=code&v=5.85'));
    fastify.get('/callback', async (req, res) => {
        if(!req.query.code) return res.redirect('/auth');
        let token = await curl('https://oauth.vk.com/access_token?client_id=' + config.vk.id + '&client_secret=' + config.vk.secret + '&redirect_uri=' + config.vk.redirect + '&code=' + req.query.code);
        if(!token.access_token) return res.redirect('/auth');
        let get = await mysql.Query('SELECT * FROM users WHERE vk = ' + token.user_id + ' limit 1');
        if(get[0]) {
            token = get[0].id;
            if(get[0].access == "0") res.send({ status: "error", msg: "Access Denied" });
        }
        else {
            let 
            userInfo = await curl('https://api.vk.com/method/users.get?fields=photo_200&access_token='+ token.access_token +'&v=5.85'),
            result = await mysql.Query(`INSERT INTO users SET ?`, { 
                vk: userInfo.response[0].id,
                name: userInfo.response[0].first_name + " " + userInfo.response[0].last_name,
                avatar: userInfo.response[0].photo_200,
                token: fastify.jwt.sign({ id: userInfo.response[0].id }),
                access: 1
            });
            token = result.insertId;
        }
        res.setCookie('token', fastify.jwt.sign({ id: token }), { path: '/' }).redirect('/');
    });   
    next();
};

function curl(url) {
    return new Promise((resolve, reject) => {
        r.get({ url: url, timeout: 15000 }, (body, res, err) => {
            if (!err && res.statusCode == 200) resolve(JSON.parse(body));
            else resolve({ error: true });
        });
    });
}