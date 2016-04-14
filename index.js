var express = require('express')
var multiparty = require('connect-multiparty')
var ogr2ogr = require('ogr2ogr')
var fs = require('fs')
var urlencoded = require('body-parser').urlencoded

function enableCors (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'POST')
  //res.header('Access-Control-Allow-Headers', 'X-Requested-With')
  next()
}

function optionsHandler (methods) {
  return function (req, res, next) {
    res.header('Allow', methods)
    res.send(methods)
  }
}

exports.createServer = function (opts) {
  if (!opts) opts = {}

  var app = express()
  app.set('views', __dirname + '/views')
  app.set('view engine', 'jade')

  app.options('/convert', enableCors, optionsHandler('POST'))
  app.options('/convertJson', enableCors, optionsHandler('POST'))
  app.options('/convertCsv', enableCors, optionsHandler('POST'))

  app.use(express.static(__dirname + '/public'))
  app.get('/', function (req, res) {
    res.render('home')
  })

  app.use(urlencoded({ extended: false, limit: 3000000 }))
  app.use(multiparty())

  app.post('/convert', enableCors, function (req, res, next) {

    var ogr = null;

    if(req.body.json){
		ogr = ogr2ogr(JSON.parse(req.body.json))
	}
	else if (req.body.jsonUrl){
		ogr = ogr2ogr(req.body.jsonUrl)
	}
	else{
		ogr = ogr2ogr(req.files.upload.path)
	}

	if (req.body.fileName) {
       ogr.options(['-nln', req.body.fileName])
    }
	
    if ('skipFailures' in req.body) {
      ogr.skipfailures()
    }

    if ('formatOutput' in req.body) {

		switch(req.body.formatOutput.toUpperCase()){
				case "CSV":
					res.header('Content-Type', 'text/csv; charset=utf-8')
					res.header('Content-Disposition', 'attachment; filename=' + (req.body.outputName || 'ogre.csv') + ".csv")
					ogr.options(['-lco', 'GEOMETRY=AS_XY']);
					if('separateurOutput' in req.body)
						ogr.options(['-lco', 'SEPARATOR='+req.body.separateurOutput]);
					if('X_POSSIBLE_NAMES' in req.body)
						ogr.options(['-oo', 'X_POSSIBLE_NAMES='+req.body.X_POSSIBLE_NAMES])
					if('Y_POSSIBLE_NAMES' in req.body)
						ogr.options(['-oo', 'Y_POSSIBLE_NAMES='+req.body.Y_POSSIBLE_NAMES])
				break;
				case "BNA":
					res.header('Content-Type', 'text/plain; charset=utf-8')
					res.header('Content-Disposition', 'attachment;filename=' + (req.body.outputName || 'ogre.bna') + ".bna")
				break;
				case "GEOJSON":
					res.header('Content-Type', 'application/json; charset=utf-8')
					res.header('Content-Disposition', 'attachment; filename=' + (req.body.outputName || 'ogre.geojson') + ".geojson")
				break;
				case "GEOCONCEPT":
					res.header('Content-Type', 'text/plain; charset=utf-8')
					res.header('Content-Disposition', 'attachment; filename=' + (req.body.outputName || 'ogre.gxt') + ".gxt")
				break;
				case "DXF":
				case "DGN":
					res.header('Content-Type', 'application/octet-stream; charset=utf-8')
					res.header('Content-Disposition', 'attachment; filename=' + (req.body.outputName || 'ogre.gxt') + ".dgn")
				break;
				case "GEORSS":
					res.header('Content-Type', 'application/xml; charset=utf-8')
					res.header('Content-Disposition', 'attachment; filename=' + (req.body.outputName || 'ogre.rss') + ".rss")
					if(req.body.targetSrs)
						req.body.targetSrs = "EPSG:4326";
				break;
				case "GML":
					res.header('Content-Type', 'application/xml; charset=utf-8')
					res.header('Content-Disposition', 'attachment; filename=' + (req.body.outputName || 'ogre.gml') + ".gml")
				break;
				case "GMT":
					res.header('Content-Type', 'text/csv; charset=utf-8')
					res.header('Content-Disposition', 'attachment; filename=' + (req.body.outputName || 'ogre.gmt') + ".gmt")
				break;
				case "GPX":
					res.header('Content-Type', 'application/xml; charset=utf-8')
					res.header('Content-Disposition', 'attachment; filename=' + (req.body.outputName || 'ogre.gpx') + ".gpx")
					if(req.body.targetSrs)
						req.body.targetSrs = "EPSG:4326";
				break;
				case "KML":
					res.header('Content-Type', 'application/xml; charset=utf-8')
					res.header('Content-Disposition', 'attachment; filename=' + (req.body.outputName || 'ogre.kml') + ".kml")
					if(req.body.targetSrs)
						req.body.targetSrs = "EPSG:4326";
				break;
				case "TIGER":
					res.header('Content-Type', 'application/json; charset=utf-8')
					res.header('Content-Disposition', 'attachment; filename=' + (req.body.outputName || 'ogre.rti.zip') + ".rti.zip")
				break;
				case "VRT":
					res.header('Content-Type', 'application/json; charset=utf-8')
					res.header('Content-Disposition', 'attachment; filename=' + (req.body.outputName || 'ogre.vrt.zip') + ".vrt.zip")
				break;
				case "ESRI Shapefile":
					res.header('Content-Type', 'application/zip')
					res.header('Content-Disposition', 'attachment; filename=' + (req.body.outputName || 'ogre.zip') + ".zip")
				break;
				case "PGDUMP":
					res.header('Content-Type', 'text/plain')
					res.header('Content-Disposition', 'attachment; filename=' + (req.body.outputName || 'ogre.sql') + ".sql")
				break;
				default:
						res.header('Content-Type', 'text/plain; charset=utf-8')
						res.header('Content-Disposition', 'attachment; filename=' + (req.body.outputName || 'ogre'))
		}
      ogr.format(req.body.formatOutput)
    }
    else{
		return res.json({ errors: "Vous devez fournir un 'formatOutput' valide. '"+req.body.formatOutput+"' n'est pas un format valide."})
	}

	 if (req.body.targetSrs) {
      ogr.project(req.body.targetSrs, req.body.sourceSrs)
    }

    if (opts.timeout) {
      ogr.timeout(opts.timeout)
    }

	ogr.exec(function (er, data) {
	  if(req.files)
		fs.unlink(req.files.upload.path)

	  if (er) return res.json({ errors: er.message.replace('\n\n','').split('\n') })


	  if ('formatOutput' in req.body) {
		switch(req.body.formatOutput.toUpperCase()){

				case "GEOJSON":
				case "JSON":
					if (req.body.callback)
						res.write(req.body.callback + '(')

					  res.write(data)

					  if (req.body.callback)
						res.write(')')

					res.end();
				break;
				case "ESRI Shapefile":
				case "TIGER":
				case "VRT":
					res.end(data)
				break;
				default:
					res.write(data)
					res.end()
		}
	  }
	  else{
			 return res.json({ errors: "Vous devez fournir un 'formatOutput' valide. '"+req.body.formatOutput+"' n'est pas un format valide."})
		  }

	  //return res.json({ errors: "test" })

	})


  })

  app.use(function (er, req, res, next) {
    console.error(er.stack)
    res.header('Content-Type', 'application/json')
    res.json({ error: true, msg: er.message })
  })

  return app
}
