'use strict'

const reekoh = require('reekoh')
const _plugin = new reekoh.plugins.Service()

const request = require('request')
const async = require('async')

const isNan = require('lodash.isnan')
const isPlainObject = require('lodash.isplainobject')
const isNumber = require('lodash.isnumber')
const inRange = require('lodash.inrange')
const isEmpty = require('lodash.isempty')
const get = require('lodash.get')

_plugin.on('data', (data) => {
  if (isPlainObject(data)) {
    if (isEmpty(get(data, 'coordinates'))) {
      return _plugin.logException(new Error(`Invalid data received. Data should have a coordinates field which contains latitude and longitude.`))
    }
    async.each(data.coordinates, (coordinate, cb) => {
      if (isNan(coordinate) || !isNumber(coordinate) || !inRange(coordinate, -180, 180)) {
        cb(new Error(`Invalid coordinates. Coordinates: ${data.coordinates}`))
      } else { cb() }
    }, (error) => {
      if (error) { return _plugin.logException(error) }

      let url = `http://dev.virtualearth.net/REST/v1/Elevation/List?points=${data.coordinates.join(', ')}&heights=sealevel&key=${_plugin.config.apiKey}`

      request.get({
        url: url,
        json: true
      }, (err, response, body) => {
        if (err) { return _plugin.logException(err) }

        _plugin.pipe(data, JSON.stringify({result: get(body, 'resourceSets[0].resources[0].elevations')}))
          .then(() => {
            _plugin.log(JSON.stringify({
              title: 'Bing Maps Elevations Service Result',
              data: data.coordinates,
              result: get(body, 'resourceSets[0].resources[0].elevations')
            }))
          })
          .catch((error) => {
            _plugin.logException(error)
          })
      })
    })
  } else { _plugin(new Error(`Invalid data received. Data must be a valid JSON Object. Data: ${data}`)) }
})

_plugin.once('ready', () => {
  _plugin.log('Bing Maps Elevations Service has been initialized.')
  _plugin.emit('init')
})

module.exports = _plugin
