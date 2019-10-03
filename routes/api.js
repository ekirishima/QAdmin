const mysql = require('../lib/mysql'), jwt = require('jsonwebtoken'), centrifugo = require('../lib/centrifugo');
module.exports = function (fastify, opts, next) {
    fastify.get('/rooms', { preValidation: [fastify.api_auth] }, async (req, res) => {
    	let projects = await mysql.Query(`SELECT * FROM rooms WHERE user_id = "${ req.user[0].id }" ORDER BY fastupd DESC`);
        res.send({ projects: projects, time: Date.now() });
    });
    fastify.get('/orgs', { preValidation: [fastify.api_auth] }, async (req, res) => {
        let projects = await mysql.Query(`SELECT org FROM rooms WHERE user_id = "${ req.user[0].id }" GROUP BY org`);
        res.send(projects);
    });
    fastify.get('/room/:id', { preValidation: [fastify.api_auth] }, async (req, res) => {
    	let projects = await mysql.Query(`SELECT * FROM rooms WHERE id = ` + req.params.id);
        if(!projects[0]) return res.send({ status: 'error', msg: 'PC dont find' });
        if(projects[0].user_id != req.user[0].id) return res.send({ status: 'error', msg: 'PC Not Allowed' });
        return res.send({ room: projects[0], time: Date.now() });
    });
    fastify.post('/console/:id', { preValidation: [fastify.api_auth] }, async (req, res) => {
        let projects = await mysql.Query(`SELECT * FROM rooms WHERE id = ` + req.params.id);
        if(!projects[0]) return res.send({ status: 'error', msg: 'PC dont find' });
        if(projects[0].user_id != req.user[0].id) return res.send({ status: 'error', msg: 'PC Not Allowed' });
        centrifugo.Send({"method": "publish", "params": {"channel": "user#" + projects[0].user_id, "data":  { type: "console", data: req.body.output } }});
        return res.send({ status: 'ok' });
    });
    fastify.post('/console/:id/send', { preValidation: [fastify.api_auth] }, async (req, res) => {
        let projects = await mysql.Query(`SELECT * FROM rooms WHERE id = ` + req.params.id);
        if(!projects[0]) return res.send({ status: 'error', msg: 'PC dont find' });
        if(projects[0].user_id != req.user[0].id) return res.send({ status: 'error', msg: 'PC Not Allowed' });
        centrifugo.Send({"method": "publish", "params": {"channel": "pc#" + req.params.id, "data":  { type: 'console', input: req.body.data }}});
        return res.send({ status: 'ok' });
    });
    fastify.get('/room/:id/devices', { preValidation: [fastify.api_auth] }, async (req, res) => {
    	let projects = await mysql.Query("SELECT * FROM rooms WHERE id = " + req.params.id);
        if(!projects[0]) return res.send({ status: 'error', msg: 'PC dont find' });
        if(projects[0].user_id != req.user[0].id) return res.send({ status: 'error', msg: 'PC Not Allowed' });
        projects = await mysql.Query(`SELECT * FROM devices WHERE room_id = ${ req.params.id } ORDER BY type`); 
        return res.send(projects);
    });

    fastify.post('/room/:id/delete', { preValidation: [fastify.api_auth] }, async (req, res) => {
        let projects = await mysql.Query("SELECT * FROM rooms WHERE id = " + req.params.id);
        if(!projects[0]) return res.send({ status: 'error', msg: 'PC dont find' });
        if(projects[0].user_id != req.user[0].id) return res.send({ status: 'error', msg: 'PC Not Allowed' });
        let devices = await mysql.Query("DELETE FROM `devices` WHERE `room_id` = " + projects[0].id);
        projects = await mysql.Query("DELETE FROM rooms WHERE id = " + projects[0].id);
        return res.send({ status: 'success' });
    });

    fastify.post('/room/:id/comment', { preValidation: [fastify.api_auth] }, async (req, res) => {
        let projects = await mysql.Query("SELECT * FROM rooms WHERE id = " + req.params.id);
        if(!projects[0]) return res.send({ status: 'error', msg: 'PC dont find' });
        if(projects[0].user_id != req.user[0].id) return res.send({ status: 'error', msg: 'PC Not Allowed' });
        projects = await mysql.Query("UPDATE rooms SET ? WHERE id = " + req.params.id, { comment: req.body.data });
        return res.send({ status: 'success' });
    });



    fastify.post('/room/identificate', { preValidation: [fastify.api_auth] }, async (req, res) => {
        if(!req.body.org) req.body.org = '';
        if(!req.body.name) return res.send({ status: 'error', msg: 'PC NAME REQUIRE!' });
    	let insertId, add, projects = await mysql.Query(`SELECT * FROM rooms WHERE name = "${ req.body.name }" and org = "${ req.body.org }" and user_id = "${ req.user[0].id }" LIMIT 1`);
	    if(!projects[0]) {
	    	add = await mysql.Query("INSERT INTO rooms SET ? ", { name: req.body.name, org: req.body.org, user_id: req.user[0].id });
	    	insertId = add.insertId;
	    } else insertId = projects[0].id;
	    return res.send({ id: insertId, centrifugo: jwt.sign({ sub: insertId.toString(), exp: new Date().getTime() * 3600 }, 'f9b89ac3-3651-43b5-9de0-57819e9d4805', { algorithm: 'HS256'}) });
    });
    fastify.post('/room/:id', { preValidation: [fastify.api_auth] }, async (req, res) => {
        let projects = await mysql.Query(`SELECT * FROM rooms WHERE id = ${ req.params.id } LIMIT 1`);
        if(!projects[0]) return res.send({ status: 'error', msg: 'Dont find PC' });
        if(projects[0].user_id != req.user[0].id) return res.send({ status: 'error', msg: "Dont allowed" });
    	let find = await mysql.Query(`SELECT * FROM devices WHERE room_id = ${ req.params.id } and type = "${ req.body.type }" LIMIT 1`), insertId, add;
    	if(!find[0]) {
    		add = await mysql.Query("INSERT INTO devices SET ? ", { name: req.body.name, room_id: req.params.id, type: req.body.type });
	    	insertId = add.insertId;
    	} else insertId = find[0].id;
    	let update = await mysql.Query("UPDATE devices SET ? WHERE id = " + insertId, { data: req.body.data });
        update = await mysql.Query("UPDATE rooms SET ? WHERE id = " + req.params.id, { fastupd: Date.now(), user_id: req.user[0].id });
        let latest_version = await mysql.Query('select v from software_version where status = 1 order by id desc limit 1');
        centrifugo.Send({"method": "publish", "params": {"channel": "user#" + projects[0].user_id, "data":  { type: "pcupdates", data: 'TIPIDOR' } }});
        centrifugo.Send({"method": "publish", "params": {"channel": "user#" + projects[0].user_id, "data":  { type: "statsnew", data: projects[0].id } }});
    	return res.send({ status: 'success', v: latest_version[0].v });
    });
    fastify.post('/v', { preValidation: [fastify.api_auth] }, async (req, res) => {
        let projects = await mysql.Query(`SELECT * FROM software_version WHERE STATUS=1 ORDER BY id DESC LIMIT 0,1`);
        return res.send({ room: projects[0] });
    });
    next();
};