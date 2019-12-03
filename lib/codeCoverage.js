const log = require("@ui5/logger").getLogger("server:custommiddleware:code-coverage")
const im = require('istanbul-middleware')
const express = require("express")
const path = require('path')
const url = require("url")
const fs = require('fs')
const https = require('https')
const axios = require('axios')
const cors = require('cors')


function matcher(req, pattern) {
  var parsed = url.parse(req.url);
  //Todo: Add matching pattern to the yaml file
  if (pattern.test(parsed.pathname)) {
    return parsed.pathname
  } else {
    return null;
  }
}

/**
 * Custom UI5 Server middleware example
 *
 * @param {Object} parameters Parameters
 * @param {Object} parameters.resources Resource collections
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.all Reader or Collection to read resources of the
 *                                        root project and its dependencies
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.rootProject Reader or Collection to read resources of
 *                                        the project the server is started in
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.dependencies Reader or Collection to read resources of
 *                                        the projects dependencies
 * @param {Object} parameters.options Options
 * @param {string} [parameters.options.configuration] Custom server middleware configuration if given in ui5.yaml
 * @returns {function} Middleware function to use
 */
module.exports = function ({
  resources,
  options
}) {
  //Works for clientside
  const app = express();

  // set up basic middleware
  const watchPath = options.configuration.path || 'webapp';

  app.use(cors())

  let publicDir = path.join(process.cwd(), watchPath)
  im.hookLoader(publicDir);

  app.use('/coverage', im.createHandler({
    verbose: true,
    resetOnGet: true
  }));
  app.use(im.createClientHandler(publicDir, {
    matcher: matcher
  }));
  log.info("Coverage is running on port 3000")
  app.listen(3000);


  return function (req, res, next) {

    var pathname = matcher(req, options.configuration.regExp);
    if (pathname) {

      var code;

      const instance = axios.create({
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      });

      //Todo Add auth to yaml file
      var uname = options.configuration.auth.split(":")[0];
      var pass = options.configuration.auth.split(":")[1];

      let url = options.configuration.hostname + pathname;
      if (options.configuration.client) {
        url += "?sap-client=" + options.configuration.client;
      }

      //Todo: Read hostname from yaml file
      instance.get(url, {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        auth: {
          username: uname,
          password: pass
        }
      }).then(function (response) {
        let fileName = process.cwd() + "/test_coverage" + pathname.replace(pathname.substring(pathname.indexOf("~"), pathname.lastIndexOf("~") + 3), ""),
          fileNameArr = fileName.split("/");

        fileNameArr.pop();
        dirName = fileNameArr.join("/");
        code = response.data;

        console.log(dirName)
        fs.mkdirSync(dirName, {
          recursive: true
        });
        console.log("Instrumented " +fileName)
        fs.writeFileSync(fileName, code);

        if (code) {
          instrumenter = im.getInstrumenter();
          res.send(instrumenter.instrumentSync(code, fileName));

        } else {
          next();
        }
      }).catch(function (error) {
        console.log('Error on Instrumenting file');
        if (!error.response) {
          console.log(error)
        }
        next();
      });
    } else {
      next()
    }
  }

};