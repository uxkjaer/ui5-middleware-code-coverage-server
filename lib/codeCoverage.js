// eslint-disable-next-line import/no-unresolved
const log = require('@ui5/logger').getLogger('server:custommiddleware:code-coverage')
const im = require('istanbul-middleware')
const express = require('express')
const path = require('path')
const url = require('url')
const fs = require('fs')
const https = require('https')
const axios = require('axios')
const cors = require('cors')


function matcher(req, pattern) {
  const regExp = new RegExp(pattern, 'i')
  const parsed = url.parse(req.url)


  if (regExp.test(parsed.pathname)) {
    return parsed.pathname
  }
  return null
}

/**
 * Custom UI5 Server middleware example
 *
 * @param {Object} parameters Parameters
 * @param {Object} parameters.resources Resource collections
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.
 *        all Reader or Collection to read resources of the root project and its dependencies
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.
 *        rootProject Reader or Collection to read resources of the project the server is started in
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.
 * dependencies Reader or Collection to read resources of the projects dependencies
 * @param {Object} parameters.options Options
 * @param {string} [parameters.options.configuration] Custom server middleware
 * configuration if given in ui5.yaml
 * @returns {function} Middleware function to use
 */
// eslint-disable-next-line func-names
module.exports = function ({
  options,
}) {
  // Works for clientside
  const app = express()

  // set up basic middleware
  const watchPath = options.configuration.path || 'webapp'

  app.use(cors())

  const publicDir = path.join(process.cwd(), watchPath)
  im.hookLoader(publicDir)

  app.use('/coverage', im.createHandler({
    verbose: true,
    resetOnGet: true,
  }))
  app.use(im.createClientHandler(publicDir, {
    matcher,
  }))
  log.info('Coverage is running on port 3000')
  app.listen(3000)


  // eslint-disable-next-line func-names
  return function (req, res, next) {
    const pathname = matcher(req, options.configuration.regExp)
    if (pathname) {
      let code

      const instance = axios.create({
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
      })

      // Todo Add auth to yaml file
      const uname = options.configuration.auth.split(':')[0]
      const pass = options.configuration.auth.split(':')[1]

      let urlResolved = options.configuration.hostname + pathname
      if (options.configuration.client) {
        urlResolved += `?sap-client=${options.configuration.client}`
      }

      // Todo: Read hostname from yaml file
      instance.get(urlResolved, {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        auth: {
          username: uname,
          password: pass,
        },
      }).then((response) => {
        const fileName = `${process.cwd()}/test_coverage${pathname.replace(pathname.substring(pathname.indexOf('~'), pathname.lastIndexOf('~') + 3), '')}`
        const fileNameArr = fileName.split('/')

        fileNameArr.pop()
        const dirName = fileNameArr.join('/')
        code = response.data

        console.log(dirName)
        fs.mkdirSync(dirName, {
          recursive: true,
        })
        console.log(`Instrumented ${fileName}`)
        fs.writeFileSync(fileName, code)

        if (code) {
          const instrumenter = im.getInstrumenter()
          res.send(instrumenter.instrumentSync(code, fileName))
        } else {
          next()
        }
      }).catch((error) => {
        console.log('Error on Instrumenting file')
        if (!error.response) {
          console.log(error)
        }
        next()
      })
    } else {
      next()
    }
  }
}
