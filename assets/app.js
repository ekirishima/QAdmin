$.ajaxSetup({ 
    headers: {'Authorization': token } 
});

var groups = {
	data: null,
	orgs: null,
	lastupd: null,
	get: () => {
		helper.template('welcome');
		helper.loading('#app #items');
		helper.loading('#app #filter');
		// Устройства
		$.get('/api/rooms', (data) => {
			groups.data = data.projects;
			groups.lastupd = data.time;
			groups.render(data.projects);
			$.post('/api/v', (data) => {
				//Версии
				vers = data.room;
				console.log(vers)
				let html = `<div class="card-header">Версия клиента <b style="float: right;">${ vers.v }</b></div>
		                    <div class="card-body">
		                        <a class="btn btn-success btn-block mb-3" href="${ vers.url_zip }">Скачать актуальную версию</a>
		                        <div class="list">Ваш токен: <span class="badge badge-secondary" style="overflow-y: scroll;padding: 20px;">${token}</span></div>
		                        <button class="btn btn-danger btn-block" type="button" data-toggle="modal" data-target="#exampleModal">Инструкция по запуску</button>
		                    </div>`;
				$('#software_version').html(html);
			}).fail(() => helper.error('#software_version'));
			// Организации
			$.get('/api/orgs', (data) => {
				groups.orgs = data;
				let html = '<div class="form-group"><label>Поиск по названию</label><input type="text" id="filter_name_search" class="form-control"></div><div class="form-group"><label>Организация</label><select class="form-control" id="filter_name_select"><option>Все</option>';
				for(let i in data) if(data[i].org) html += '<option value="'+ data[i].org + '">'+ data[i].org + '</option>';
				html += '</select></div><button class="btn btn-block btn-success" onclick="return groups.filter();">Поиск</button>';
				$('#app #filter').html(html);
			}).fail(() => helper.error('#app #filter'));
		}).fail(() => helper.error('#app #items'));
	},
	filter: () => {
		let selected = $('#filter_name_select')[0].selectedOptions[0].value, arr = groups.data.slice(0);
		if(selected != 'Все') for(let i in arr) if(arr[i].org != selected) delete arr[i];
		if($('#filter_name_search').val()) for(let i in arr) if (!arr[i].name.match(eval('{' + ('/' + $('#filter_name_search').val() + '/gi') + '}'))) delete arr[i];
		groups.render(arr);
	},
	render: (arr, time) => {
		$('#app #items').html('');
		for(let i in arr) {
			let status = 'offline';
			if(parseFloat(arr[i].fastupd) + 30000 > groups.lastupd) status = 'online';
			if(!arr[i].comment) arr[i].comment = 'Без коммента';
			$('#app #items').append(`<div class="col-lg-4"><div onclick="return zone.get(${ arr[i].id });" class="bg-white shadow-sm rounded style${ helper.randomInteger(1, 3) }" id="pc">
	                <span class="status status-${ status }" id="status-${ arr[i].id }"></span>
	                <span class="comment">${ arr[i].comment }</span>
	                <span class="org">${ arr[i].org }</span>
	                <span class="name">${ arr[i].name }</span>
            	</div></div>`);
		}
	}
};

var zone = {
	lastpc: null,
	request: true,
	get: (id) => {
		helper.template('computer');
		helper.loading('#app #data');
		helper.loading('#app #desc_pc');
		zone.lastpc = id;

		$.get('/api/room/' + id, (data) => {
			let status = 'offline', statusname = 'Выключен', status1 = 'danger';
			if(parseFloat(data.room.fastupd) + 30000 > data.time) {
				status = 'online';
				statusname = 'Включен';
				status1 = 'success';
			}
			if(!data.room.comment) data.room.comment = 'Без памятки';
			$('#app #desc_pc').html(`<button class="btn btn-block btn-secondary btn-sm mb-4" onclick="return groups.get();">Назад</button>
				<button class="btn btn-block btn-success btn-sm mb-4" onclick="return conget.open(${ id });">Консоль</button>
                <div class="bg-white shadow-sm rounded style${ helper.randomInteger(1, 3) } mb-4" id="pc">
                    <span class="status status-${ status }" id="status-page-${ id }"></span>
                    <span class="org">${ data.room.org }</span>
                    <span class="name">${ data.room.name }</span>
                </div>
                <div class="card">
                    <div class="card-header">Описание</div>
                    <div class="card-body">
                        <div class="list">Состояние: <span id="badge-status-${ id }" class="badge badge-${ status1 }">${ statusname }</span></div>
                        <div class="list">Организация: <span class="badge badge-secondary">${ data.room.org }</span></div>
                        <div class="list">Внешний IP: <span class="badge badge-success" id="output_ip_addr">....</span></div>
                        <div class="list">Памятка:<div class="input-group mt-2">
						  <input type="text" class="form-control" value="${ data.room.comment }" id="ebuchaya-pamyatka">
						  <div class="input-group-append">
						    <button class="btn btn-success" type="button" id="button-addon2" onclick="return zone.comment();">ред</button>
						  </div>
						</div></div>
                    </div>
                </div>
                <button onclick="return zone.remove(${ id });" class="btn btn-danger btn-block mt-4">Удалить</button>`);
		}).fail(() => helper.error('#app #desc_pc'));

		zone.content(id);
	},
	content: (id) => {
		if(!zone.request) return false;
		zone.request = false;
			$.get('/api/room/' + id + '/devices', (data) => {
				zone.request = true;
				console.log(data)
				let html = '', cpuload = 0;
				for(let i in data) {
					let info = data[i].data;
					if(data[i].type == 'users') {
						html += '<h5>'+ data[i].name +'</h5><hr />';
						info = JSON.parse(info);
						html += '<div class="users row mb-4">';
						for(let r in info) html += `<div class="col"><div class="bg-white shadow-sm rounded p-4"><h5>${ info[r].user }</h5><span class="text-muted">${ info[r].date } ${ info[r].time }</span></div></div>`;
						html += '</div>';
					}
					else if(data[i].type == 'os') {
						html += '<h5>'+ data[i].name +'</h5><hr />';
						info = JSON.parse(info);
						html += `<div class="os bg-white p-4 shadow-sm rounded mb-4">
		                    <h6 class="mb-4">Дистрибутив: <span class="badge badge-success">${ info.distro }</span></h6>
		                    <h6 class="mb-4">Бит: <span class="badge badge-success">${ info.arch }</span></h6>
		                    <h6>Имя компьютера: <span class="badge badge-success">${ info.hostname }</span></h6>
		                </div>`;
					}
					else if(data[i].type == 'cpu') {
						html += '<h5>'+ data[i].name +'</h5><hr />';
						info = JSON.parse(info);
						html += `<div class="proc bg-white p-4 shadow-sm rounded mb-4">
		                    <h6 class="mb-4">Бренд: <span class="badge badge-success">${ info.manufacturer }</span></h6>
		                    <h6 class="mb-4">Наименование: <span class="badge badge-success">${ info.brand }</span></h6>
		                    <h6 class="mb-4">Ядер: <span class="badge badge-success">${ info.cores }</span></h6>
		                    <h6 class="mb-4">Кол-во процессоров: <span class="badge badge-success">${ info.processors }</span></h6>
		                    <h6 class="mb-4">Скорость GHZ: <span class="badge badge-success">${ info.speed }</span></h6>
		                    <h6>Нагрузка CPU в данный момент: </h6>
		                    <div class="progress">
	                                <div class="progress-bar" role="progressbar" id="load_me_info_progress" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
	                        </div>
		                </div>`;
					}
					else if(data[i].type == 'videocard') {
						info = JSON.parse(info);
						if(info.controllers[0]) {
							html += '<h5>'+ data[i].name +'</h5><hr /><div class="videocard row mb-4">';
							for(let r in info.controllers) html += `<div class="col"><div class="bg-white p-4 rounded shadow-sm"><h6>${ info.controllers[r].model }</h6><span>Память ${ info.controllers[r].vram } МБ</span></div></div>`;
			                html += '</div>';
		        		}
					}
					else if(data[i].type == 'networks') {
						html += '<h5>'+ data[i].name +'</h5><hr />';
						info = JSON.parse(info);
						html += `<div class="row mb-4">`;
						for(let r in info) html += `
		                    <div class="col-lg-6 mb-4">
	                        <div class="bg-white p-4 rounded shadow-sm">
	                            <h6>${ info[r].iface }</h6>
	                            <div>IPv4: <span class="badge badge-success">${ info[r].ip4 }</span></div>
	                            <div>IPv6: <span class="badge badge-success">${ info[r].ip6 }</span></div>
	                            <div>MAC: <span class="badge badge-success">${ info[r].mac }</span></div>
	                            <div>Скорость: <span class="badge badge-success">${ info[r].speed }MB</span></div>
	                        </div>
	                    </div>`;
		                html += `</div>`;
					}
					else if(data[i].type == 'dns') {
						html += '<h5>'+ data[i].name +'</h5><hr />';
						info = JSON.parse(info);
						html += `<div class="row mb-4"><div class="col"><div class="bg-white p-4 rounded shadow-sm"><h6>`;
	                    for(let r in info) html += `<span class="badge badge-success mr-2">${ info[r] }</span>`
	                    html += `</h6></div></div></div></div>`;
					}
					else if(data[i].type == 'cpuCurrentspeed') {
						info = JSON.parse(info);
						cpuload = info.currentload;
					}
					else if(data[i].type == 'memory') {
						html += '<h5>'+ data[i].name +'</h5><hr />';
						info = JSON.parse(info);
						html += `<div class="ozy row mb-4">
		                    <div class="col-lg-6">
		                        <div class="bg-white p-4 rounded shadow-sm">
		                            <h6>Всего: свободно ${ parseFloat(info.free / 1024 / 1024 /1024).toFixed(2) } Гб из ${ parseFloat(info.total / 1024 / 1024 /1024).toFixed(2) } Гб</h6>
		                            <div class="progress">
		                                <div class="progress-bar" role="progressbar" style="width: ${ parseFloat((info.used / info.total) * 100).toFixed(2) }%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">${ parseFloat((info.used / info.total) * 100).toFixed(2) }%</div>
		                            </div>
		                        </div>
		                    </div>
		                    <div class="col-lg-6">
		                        <div class="bg-white p-4 rounded shadow-sm">
		                            <h6>SWAP: свободно ${ parseFloat(info.swapfree / 1024 / 1024 /1024).toFixed(2) } Гб из ${ parseFloat(info.swaptotal / 1024 / 1024 /1024).toFixed(2) } Гб</h6>
		                            <div class="progress">
		                                <div class="progress-bar" role="progressbar" style="width: ${ parseFloat((info.swapused / info.swaptotal) * 100).toFixed(2) }%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">${ parseFloat((info.swapused / info.swaptotal) * 100).toFixed(2) }%</div>
		                            </div>
		                        </div>
		                    </div>
		                </div>`;
					}
					else if(data[i].type == 'hardware') {
						html += '<h5>'+ data[i].name +'</h5><hr /><div class="hardrive row mb-4">';
						info = JSON.parse(info);
	                    for (let r in info) html += `<div class="col-lg-6">
	                        <div class="bg-white p-4 rounded shadow-sm mb-4">
	                            <h6>(${ info[r].type }) ${ info[r].fs } свободно ${ parseFloat((info[r].size - info[r].used) / 1024 / 1024 /1024).toFixed(2) } Гб из ${ parseFloat(info[r].size / 1024 / 1024 /1024).toFixed(2) } Гб</h6>
	                            <div class="progress">
	                                <div class="progress-bar" role="progressbar" style="width: ${ parseFloat((info[r].used / info[r].size) * 100).toFixed(2) }%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">${ parseFloat((info[r].used / info[r].size) * 100).toFixed(2) }%</div>
	                            </div>
	                        </div>
	                    </div>`;
	                	html += `</div>`;
					}
					else if(data[i].type == 'IP') {
						info = JSON.parse(info);
						$('#output_ip_addr').html(info.ip);
					}
					else { 
						console.log('Hmm'); 
					}
				}
				$('#app #data').html(html);
				$('#load_me_info_progress').html(cpuload.toFixed(2)+'%').css( "width", `${cpuload}%` );
			}).fail(() => { zone.request = true; helper.error('#app #data'); });
	},
	comment: () => {
		if(!$('#ebuchaya-pamyatka').val()) return false;
		if(!zone.lastpc) return false;
		$.post('/api/room/'+ zone.lastpc +'/comment', { data: $('#ebuchaya-pamyatka').val() }, (data) => {
			alert('Успешно!');
		}).fail(() => alert('Ошибка обновления'));
	},
	remove: (id) => {
		$.post('/api/room/'+ zone.lastpc +'/delete', (data) => {
			return groups.get();
		}).fail(() => alert('Ошибка обновления'));
	}
};

var helper = {
	tpl: null,
	template: (data) => {
		helper.tpl = data;
		$('#app [data-page]').hide();
		$('#app [data-page="'+ data +'"]').show();
	},
	loading: (e) => {
		return $(e).html(`<div class="spinner-border" style="margin: 0 auto;display: block;" role="status"><span class="sr-only">Loading...</span></div>`);
	},
	randomInteger: (min, max) => {
	  let rand = min + Math.random() * (max + 1 - min);
	  return Math.floor(rand);
	},
	error: (e) => {
		return $(e).html(`<div class="alert alert-danger text-center" style="width: 100%;">Ошибка получения данных...</div>`);
	}
};


groups.get();

var conget = {
	disabled: false,
	lastactive: null,
	open: (id) => {
		conget.lastactive = id;
		conget.disabled = false;
		$('#group_get_open').modal('show');
		$('#group_get_open pre').html('');
		$('#group_get_open input').val('');
		$('#group_get_open input').focus();
		return true;
	},
	add: (data) => {
		$('#group_get_open .bg-dark').append(data);
		$('#group_get_open .bg-dark').stop().animate({ scrollTop: $('#group_get_open .bg-dark')[0].scrollHeight }, 100);
		conget.disabled = false;
		return true;
	},
	send: () => {
		if(conget.disabled) return false;
		if(!$('#group_get_open input').val()) return false;
		$.post('/api/console/' + conget.lastactive + '/send', { data: $('#group_get_open input').val() }, (data) => {
			conget.add("\n"+ $('#group_get_open input').val() +"\n");
			conget.disabled = true;
			$('#group_get_open input').val('');
		}).fail(() => {
			conget.add("\nОшибка отправки запроса...\n");
		});
	}
}

$(document).keydown(function (e) { 
	if(e.key == 'Enter' && $('#group_get_open input').val()) return conget.send();
});