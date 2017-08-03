'use strict'

const assert = require('assert')

const brewski = require('brewski')
const toRoutes = require('obj-to-routes')
const app = brewski()

const cors = require('cors')
const helmet = require('helmet')
const bodyParser = require('body-parser')

const { log } = app

function apit (obj = {}, port = 8000) {
  assert.equal(typeof obj, 'object', 'invalid object provided')
  assert.equal(typeof port, 'number', 'port must be a number')

  const routes = toRoutes(obj)

  routes.forEach(({ path, value }) => {
    app.get(path, (req, res) => {
      res.send(value)
    })
  })

  app.use(bodyParser.json())
  app.use(cors())
  app.use(helmet())

  app.listen(port, () => {
    log.info(`Server listening at http://localhost:${port}`)
  })
}

module.exports = apit
