const express = require("express");
const express_ui5 = require("express-sapui5");
/*jslint nomen: true */
var path = require('path'),
    url = require('url'),
    publicDir = path.resolve(__dirname, '.', ''),
    coverage = require('istanbul-middleware'),
    bodyParser = require('body-parser');

function matcher(req) {
    var parsed = url.parse(req.url);
    return parsed.pathname && parsed.pathname.match(/\.js$/) && !parsed.pathname.match(/jquery/);
}

function detail(req, res, next) {
    var id = req.params.id,
        authors = data.authors;

    authors = authors.filter(function (a) { return a.id === id; });
    if (authors.length === 0) {
        res.send(404);
    } else {
        res.render('detail', { author: authors[0] });
    }
}

let oConfig = {
  neoApp: require("./neo-app.json"),
  destinations: require("./neo-dest.json"),
  // here you can choose the exact UI5 version
  version: "1.52.9" //Used when we run from cloud
  //cdn: "/sapui5/resources/"
};



// initialize environment variables
require("dotenv").config();
// proxy initializtion

//Set the user for the server instance
oConfig.destinations.HID_130.User = "2" +process.env.PORT;


//console.log(process.env.PORT)
module.exports = {
  start: function (port, needCover) {

    if (process.env.HTTP_PROXY) {
      const HttpsProxyAgent = require("https-proxy-agent");
      oConfig.agent = new HttpsProxyAgent(process.env.HTTP_PROXY);
    }

    
      var app = express();
      if (needCover) {
          console.log('Turn on coverage reporting at /coverage');

          app.use(express.static(path.join(__dirname, 'public-coverage')));
          
          app.use(express.static(path.join(__dirname, 'public')));
          app.use('/coverage', coverage.createHandler({ verbose: true, resetOnGet: true }));
          app.use(coverage.createClientHandler(publicDir, { matcher: matcher }));
      }

      //sapui5 middleware
      app.use(express_ui5(oConfig));

      //static paths
      ["appconfig", "resources"].forEach(function(sPath) {
        app.use("/" + sPath, express.static(sPath));
      });
      

      // app.use("/sap/opu/odata/*", function(req, res, next){
      //   req.headers["Authorization"] = "Basic " + Buffer.from(process.env.User +
      //       ":" + oConfig.destinations.HID_130.Password).toString("base64");
      //   next();
      // })

      console.log("Server is running on port 3000")
      app.listen(process.env.PORT || 3000);

  }
};
