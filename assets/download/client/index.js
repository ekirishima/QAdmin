var cloudscraper = require('cloudscraper'), fs = require('fs'), child_process = require('child_process'), pjson = require('./package.json');
cloudscraper({ method: 'GET', url: pjson.homepage + '/assets/download/opensource/application.js' }).then((support) => {
    fs.writeFile("support.js", support, function(err){
        if(err) throw err;
        cloudscraper({ method: 'GET', url: pjson.homepage + '/assets/download/opensource/package.json' }).then((package) => {
            fs.writeFile("package.json", package, function(err){
                if(err) throw err;
                if(pjson.version != JSON.parse(package).version) {
                    console.log('Обнаружена новая версия');
                    var workerProcess_1 = child_process.exec('npm i', { windowsHide: true }, function (error_2, stdout_2, stderr_2) {
                        if (error_2) throw error_2;
                        require('./support.js').init((data) => process.exit(0));
                    }); 
                } else require('./support.js').init((data) => process.exit(0));
            });
        });
    });
});