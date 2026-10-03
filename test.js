'use strict'

const cors = require('cors')

// Keep all traffic in memory; the real middleware and route converter still run.
jest.mock('brewski', () => jest.fn())

function response () {
  const headers = {}
  return {
    statusCode: 200,
    headers,
    getHeader: name => headers[name.toLowerCase()],
    setHeader: (name, value) => { headers[name.toLowerCase()] = value },
    end: jest.fn(),
    send: jest.fn()
  }
}

function runCors (options, method = 'GET', headers = {}, res = response()) {
  const next = jest.fn()
  cors(options)({ method, headers }, res, next)
  return { res, next }
}

test('default CORS allows an origin and continues a GET request', () => {
  const { res, next } = runCors(undefined, 'GET', { origin: 'https://client.example' })
  expect(res.getHeader('Access-Control-Allow-Origin')).toBe('*')
  expect(res.getHeader('Access-Control-Allow-Credentials')).toBeUndefined()
  expect(res.getHeader('Access-Control-Allow-Methods')).toBeUndefined()
  expect(next.mock.calls).toEqual([[]])
  expect(res.end).not.toHaveBeenCalled()
})

test('default CORS continues requests without an Origin header', () => {
  const { res, next } = runCors()
  expect(res.getHeader('Access-Control-Allow-Origin')).toBe('*')
  expect(next.mock.calls).toEqual([[]])
})

test('default preflight reflects requested headers and ends with an empty 204', () => {
  const { res, next } = runCors(undefined, 'OPTIONS', {
    origin: 'https://client.example',
    'access-control-request-method': 'GET',
    'access-control-request-headers': 'X-Request-Id,Content-Type'
  })
  expect(res.statusCode).toBe(204)
  expect(res.getHeader('Access-Control-Allow-Origin')).toBe('*')
  expect(res.getHeader('Access-Control-Allow-Methods')).toBe('GET,HEAD,PUT,PATCH,POST,DELETE')
  expect(res.getHeader('Access-Control-Allow-Headers')).toBe('X-Request-Id,Content-Type')
  expect(res.getHeader('Vary')).toBe('Access-Control-Request-Headers')
  expect(res.getHeader('Content-Length')).toBe('0')
  expect(res.end.mock.calls).toEqual([[]])
  expect(next).not.toHaveBeenCalled()
})

test('preflight without requested headers omits Allow-Headers', () => {
  const { res } = runCors(undefined, 'OPTIONS')
  expect(res.statusCode).toBe(204)
  expect(res.getHeader('Access-Control-Allow-Headers')).toBeUndefined()
  expect(res.getHeader('Vary')).toBe('Access-Control-Request-Headers')
  expect(res.end).toHaveBeenCalledTimes(1)
})

test('an allowed origin is reflected without losing existing Vary headers', () => {
  const res = response()
  res.setHeader('Vary', 'Accept-Encoding')
  const result = runCors({ origin: ['https://allowed.example'] }, 'GET', {
    origin: 'https://allowed.example'
  }, res)
  expect(res.getHeader('Access-Control-Allow-Origin')).toBe('https://allowed.example')
  expect(res.getHeader('Vary')).toBe('Accept-Encoding, Origin')
  expect(result.next.mock.calls).toEqual([[]])
})

test('a disallowed origin gets no Allow-Origin header but still reaches next', () => {
  const { res, next } = runCors({ origin: ['https://allowed.example'] }, 'GET', {
    origin: 'https://denied.example'
  })
  expect(res.getHeader('Access-Control-Allow-Origin')).toBeUndefined()
  expect(res.getHeader('Vary')).toBe('Origin')
  expect(next.mock.calls).toEqual([[]])
  expect(res.end).not.toHaveBeenCalled()
})

test('a denied preflight does not grant browser access', () => {
  const { res, next } = runCors({ origin: ['https://allowed.example'] }, 'OPTIONS', {
    origin: 'https://denied.example'
  })
  expect(res.getHeader('Access-Control-Allow-Origin')).toBeUndefined()
  expect(res.statusCode).toBe(204)
  expect(res.end).toHaveBeenCalledTimes(1)
  expect(next).not.toHaveBeenCalled()
})

test('origin false disables CORS headers without terminating the request', () => {
  const { res, next } = runCors({ origin: false }, 'OPTIONS')
  expect(res.headers).toEqual({})
  expect(next.mock.calls).toEqual([[]])
  expect(res.end).not.toHaveBeenCalled()
})

test('origin callback errors are forwarded unchanged', () => {
  const error = new Error('origin lookup failed')
  const origin = jest.fn((value, callback) => callback(error))
  const { res, next } = runCors({ origin }, 'GET', { origin: 'https://client.example' })
  expect(origin.mock.calls[0][0]).toBe('https://client.example')
  expect(next.mock.calls).toEqual([[error]])
  expect(res.headers).toEqual({})
  expect(res.end).not.toHaveBeenCalled()
})

test('options delegate errors are forwarded unchanged', () => {
  const error = new Error('options lookup failed')
  const { res, next } = runCors((req, callback) => callback(error))
  expect(next.mock.calls).toEqual([[error]])
  expect(res.headers).toEqual({})
  expect(res.end).not.toHaveBeenCalled()
})

test('preflight supports maxAge zero from the cors 2.8.5 fix', () => {
  const { res } = runCors({ maxAge: 0 }, 'OPTIONS')
  expect(res.getHeader('Access-Control-Max-Age')).toBe('0')
})

test('explicit preflight configuration is preserved', () => {
  const { res } = runCors({
    origin: 'https://allowed.example',
    methods: ['GET'],
    allowedHeaders: ['X-Request-Id'],
    exposedHeaders: ['X-Result'],
    credentials: true,
    maxAge: 60,
    optionsSuccessStatus: 200
  }, 'OPTIONS', { origin: 'https://allowed.example' })
  expect(res.statusCode).toBe(200)
  expect(res.getHeader('Access-Control-Allow-Methods')).toBe('GET')
  expect(res.getHeader('Access-Control-Allow-Headers')).toBe('X-Request-Id')
  expect(res.getHeader('Access-Control-Expose-Headers')).toBe('X-Result')
  expect(res.getHeader('Access-Control-Allow-Credentials')).toBe('true')
  expect(res.getHeader('Access-Control-Max-Age')).toBe('60')
  expect(res.getHeader('Vary')).toBe('Origin')
})

test('preflightContinue leaves completion to the following middleware', () => {
  const { res, next } = runCors({ preflightContinue: true }, 'OPTIONS')
  expect(res.statusCode).toBe(200)
  expect(next.mock.calls).toEqual([[]])
  expect(res.end).not.toHaveBeenCalled()
})

function loadApit () {
  jest.resetModules()
  const app = {
    use: jest.fn(),
    get: jest.fn(),
    listen: jest.fn((port, callback) => callback()),
    log: { info: jest.fn() }
  }
  require('brewski').mockImplementation(() => app)
  return { app, apit: require('./') }
}

test('apit registers its original routes, values and explicit port', () => {
  const { app, apit } = loadApit()
  const data = { posts: { message: 'hello' }, list: [1, 2], enabled: false, count: 0 }
  expect(apit(data, 4321)).toBeUndefined()
  expect(app.get.mock.calls.map(call => call[0])).toEqual([
    '/', '/posts', '/posts/message', '/list', '/enabled', '/count'
  ])
  const values = [data, data.posts, 'hello', data.list, false, 0]
  app.get.mock.calls.forEach((call, index) => {
    const res = response()
    call[1]({}, res)
    expect(res.send.mock.calls).toEqual([[values[index]]])
  })
  expect(app.listen.mock.calls[0][0]).toBe(4321)
  expect(app.log.info).toHaveBeenCalledWith('Server listening at http://localhost:4321')
})

test('apit registers the real CORS middleware with its permissive defaults', () => {
  const { app, apit } = loadApit()
  apit({ message: 'hello' })
  expect(app.use).toHaveBeenCalledTimes(3)
  const middleware = app.use.mock.calls[1][0]
  const getResponse = response()
  const next = jest.fn()
  middleware({ method: 'GET', headers: { origin: 'https://client.example' } }, getResponse, next)
  expect(getResponse.getHeader('Access-Control-Allow-Origin')).toBe('*')
  expect(next.mock.calls).toEqual([[]])
  const preflightResponse = response()
  const preflightNext = jest.fn()
  middleware({ method: 'OPTIONS', headers: { origin: 'https://client.example' } }, preflightResponse, preflightNext)
  expect(preflightResponse.statusCode).toBe(204)
  expect(preflightResponse.getHeader('Access-Control-Allow-Origin')).toBe('*')
  expect(preflightResponse.getHeader('Content-Length')).toBe('0')
  expect(preflightResponse.end).toHaveBeenCalledTimes(1)
  expect(preflightNext).not.toHaveBeenCalled()
})

test('apit defaults to an empty root route and port 8000', () => {
  const { app, apit } = loadApit()
  apit()
  expect(app.listen.mock.calls[0][0]).toBe(8000)
  expect(app.get.mock.calls.map(call => call[0])).toEqual(['/'])
  const res = response()
  app.get.mock.calls[0][1]({}, res)
  expect(res.send.mock.calls).toEqual([[{}]])
})

test('apit rejects invalid arguments before registering middleware or listening', () => {
  const { app, apit } = loadApit()
  expect(() => apit('invalid')).toThrow('invalid object provided')
  expect(() => apit({}, '8000')).toThrow('port must be a number')
  expect(app.use).not.toHaveBeenCalled()
  expect(app.get).not.toHaveBeenCalled()
  expect(app.listen).not.toHaveBeenCalled()
})
