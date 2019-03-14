exports.loadCoverage = function (driver, yourHost, yourPort) {

    return async cb => {
  
      await driver.switchTo().defaultContent();
      const obj = await driver.executeScript(
        'return window.__coverage__;'
      );
  
      const str = JSON.stringify(obj);
      const options = {
        port: yourPort,
        host: yourHost,
        path: '/coverage/client',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      };
      const req = http.request(options, res => {
  
        let data = '';
        // you *must* listen to data event
        // so that the end event will fire...
        res.on('data', d => {
          data += d;
        });
  
        res.once('end', function () {
         // Finished sending coverage data
         cb();  // fire the final callback
        });
      });
      req.write(str);
      req.end();
  
    }
  
  };