const 
path = require('path'),
fastify = require('fastify')(),
jwt = require('jsonwebtoken'),
mysql = require('./lib/mysql');

// # Register
fastify.register(require('fastify-cookie')); // # Cookie
fastify.register(require('fastify-formbody')); // # Form
fastify.register(require('fastify-static'), { root: path.join(__dirname, 'assets'), prefix: '/assets/' }); // # Static files
fastify.register(require('point-of-view'), { engine: { nunjucks: require('nunjucks') } }); // # Template
fastify.register(require("fastify-jwt"), { secret: "ng7YgFuUtq56" });
fastify.register(require('fastify-multipart'), {
  addToBody: true,
  sharedSchemaId: 'MultipartFileType', 
  onFile: (fieldName, stream, filename, encoding, mimetype, body) => {
    stream.resume()
  }
});

// Cookie User Check
fastify.decorate("authenticate", async function(request, reply) {
    try { 
    	request.user = await fastify.jwt.verify(request.cookies.token); 
    	request.user = await mysql.Query('SELECT * FROM users WHERE id = ' + request.user.id + ' limit 1');
      request.user[0].centrifugo = jwt.sign({ sub: (request.user[0].id).toString(), exp: new Date().getTime() * 3600 }, 'f9b89ac3-3651-43b5-9de0-57819e9d4805', { algorithm: 'HS256'});
    	if(request.user[0].access == "0") throw "Access Denied";
    } 
    catch (err) { 
    	return reply.redirect('/auth');
    }
});

// API 
fastify.decorate("api_auth", async function(request, reply) {
    try { 
    	request.user = await mysql.Query('SELECT * FROM users WHERE token = "' + request.headers.authorization + '" limit 1');
    	if(request.user[0].access == "0") throw "Access Denied";
    } 
    catch (err) { 
    	return reply.send({ status: "error", msg: "Access Denied "});
    }
});



// # Route
fastify.post('/centrifuge/refresh', { preValidation: [fastify.authenticate] }, async (req, res) => {
   res.send({ token: req.user[0].centrifugo });
});
fastify.register(require('./routes/auth'), { prefix: '/auth' });
fastify.register(require('./routes/api'), { prefix: '/api' });
fastify.register(require('./routes/main'));

// # Listen
fastify.listen(2222, (err) => {
  if (err) { fastify.log.error(err); process.exit(1); }
  fastify.log.info('WebServer listen');
});