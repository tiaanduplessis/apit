'use strict'

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const vm = require('vm')

const entry = process.env.APIT_CLI_ENTRY || path.join(__dirname, 'cli.js')
const parserPath = process.env.APIT_CLI_PARSER || require.resolve('get-them-args')
const parse = require(parserPath)
const source = fs.readFileSync(entry, 'utf8')
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'apit-cli-test-'))
const data = { posts: { first: { title: 'fixture' } }, count: 2 }
const jsonFile = path.join(directory, 'data space.json')
const moduleFile = path.join(directory, 'data.js')
const invalidFile = path.join(directory, 'invalid.json')
const missingFile = path.join(directory, 'missing.json')
const ownedFiles = [jsonFile, moduleFile, invalidFile]
const allowedFiles = ownedFiles.concat(missingFile)
fs.writeFileSync(jsonFile, JSON.stringify(data))
fs.writeFileSync(moduleFile, 'module.exports = ' + JSON.stringify(data) + '\n')
fs.writeFileSync(invalidFile, '{broken')

function cleanup () {
  ownedFiles.forEach(file => {
    delete require.cache[file]
    fs.unlinkSync(file)
  })
  fs.rmdirSync(directory)
}

function run (args) {
  const previousArgs = process.argv
  const previousDirectory = process.cwd()
  const errors = []
  const calls = []
  const files = []
  const cliProcess = { exitCode: 0 }
  let thrown
  // The real parser reads process.argv. Keep both changes synchronous and
  // restore them before returning to the test runner.
  process.argv = [process.execPath, entry].concat(args)
  process.chdir(directory)
  try {
    vm.runInNewContext(source, {
      process: cliProcess,
      console: { error: message => errors.push(message) },
      require: name => {
        if (name === 'path') return path
        if (name === 'get-them-args') return parse
        if (name === './') {
          // Only the server boundary is replaced. No middleware, listening
          // socket, or legacy server dependencies can be loaded by this suite.
          return (object, port) => {
            assert.strictEqual(typeof object, 'object')
            assert.strictEqual(typeof port, 'number')
            calls.push({ object: object, port: port })
          }
        }
        assert(allowedFiles.indexOf(name) !== -1, 'Unexpected CLI dependency: ' + name)
        files.push(name)
        return require(name)
      }
    }, { filename: entry })
  } catch (error) {
    thrown = error
  } finally {
    process.argv = previousArgs
    process.chdir(previousDirectory)
  }
  return { errors: errors, calls: calls, files: files, exitCode: cliProcess.exitCode, thrown: thrown }
}

const cases = []
const check = typeof test === 'function' ? test : (name, fn) => cases.push({ name: name, fn: fn })

;[
  [], ['--help'], ['--version'], ['--port=9000'], ['--file='],
  ['--file=false'], ['--file=null'], ['--file=0']
].forEach(args => {
  check('missing file returns a nonzero status without a stack trace: ' + JSON.stringify(args), () => {
    const result = run(args)
    assert.strictEqual(result.thrown, undefined)
    assert.deepStrictEqual(result.errors, ['No file name provided'])
    assert.strictEqual(result.exitCode, 1)
    assert.deepStrictEqual(result.calls, [])
    assert.deepStrictEqual(result.files, [])
  })
})

;[
  { args: ['--file=' + jsonFile], port: 8000 },
  { args: ['--file', jsonFile, '--port', '9001'], port: 9001 },
  { args: ['-file', jsonFile, '-port=9002'], port: 9002 },
  { args: ['--file', './data space.json'], port: 8000 },
  { args: ['--file', moduleFile, '--port=9003'], port: 9003 },
  { args: ['--file', jsonFile, '--port=0'], port: 8000 },
  { args: ['--file', jsonFile, '--no-port'], port: 8000 },
  { args: ['ignored', '--file', jsonFile, '--unknown=value'], port: 8000 }
].forEach((fixture, index) => {
  check('preserves file loading and port selection: fixture ' + index, () => {
    const result = run(fixture.args)
    assert.strictEqual(result.thrown, undefined)
    assert.deepStrictEqual(result.errors, [])
    assert.strictEqual(result.exitCode, 0)
    assert.strictEqual(result.files.length, 1)
    assert.deepStrictEqual(result.calls, [{ object: data, port: fixture.port }])
  })
})

check('missing paths retain the native module-loading error', () => {
  const result = run(['--file', missingFile])
  assert.strictEqual(result.thrown && result.thrown.code, 'MODULE_NOT_FOUND')
  assert.deepStrictEqual(result.calls, [])
})

check('invalid JSON retains the native parsing error', () => {
  const result = run(['--file', invalidFile])
  assert.strictEqual(result.thrown && result.thrown.name, 'SyntaxError')
  assert.deepStrictEqual(result.calls, [])
})

;[['--file'], ['--file=true'], ['--file', '--port=9000']].forEach(args => {
  check('truthy non-path file values retain native validation: ' + JSON.stringify(args), () => {
    const result = run(args)
    assert.strictEqual(result.thrown && result.thrown.name, 'TypeError')
    assert.deepStrictEqual(result.calls, [])
    assert.deepStrictEqual(result.files, [])
  })
})

check('non-numeric ports still reach the server validation boundary', () => {
  const result = run(['--file', jsonFile, '--port=invalid'])
  assert.strictEqual(result.thrown && result.thrown.name, 'AssertionError')
  assert.deepStrictEqual(result.calls, [])
})

if (typeof test === 'function') {
  afterAll(cleanup)
} else {
  let failed = 0
  try {
    cases.forEach(item => {
      try {
        item.fn()
        console.log('ok - ' + item.name)
      } catch (error) {
        failed++
        console.error('not ok - ' + item.name + '\n' + error.stack)
      }
    })
  } finally {
    cleanup()
  }
  console.log((cases.length - failed) + ' passed; ' + failed + ' failed; real parser with guarded server boundary')
  if (failed) process.exitCode = 1
}
