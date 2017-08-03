
<h1 align="center">apit</h1>
<div align="center">
  <strong>JSON/Object to REST API with zero effort</strong>
</div>
<br>
<div align="center">
  <a href="https://npmjs.org/package/apit">
    <img src="https://img.shields.io/npm/v/apit.svg?style=flat-square" alt="npm package version" />
  </a>
  <a href="https://npmjs.org/package/apit">
  <img src="https://img.shields.io/npm/dm/apit.svg?style=flat-square" alt="npm downloads" />
  </a>
  <a href="https://github.com/feross/standard">
    <img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square" alt="standard JS linter" />
  </a>
  <a href="https://github.com/prettier/prettier">
    <img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg?style=flat-square" alt="prettier code formatting" />
  </a>
  <a href="https://travis-ci.org/tiaanduplessis/apit">
    <img src="https://img.shields.io/travis/tiaanduplessis/apit.svg?style=flat-square" alt="travis ci build status" />
  </a>
  <a href="https://github.com/tiaanduplessis/apit/blob/master/LICENSE">
    <img src="https://img.shields.io/npm/l/apit.svg?style=flat-square" alt="project license" />
  </a>
  <a href="http://makeapullrequest.com">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="make a pull request" />
  </a>
</div>
<br>
<div align="center">
  <a href="https://github.com/tiaanduplessis/apit/watchers">
    <img src="https://img.shields.io/github/watchers/tiaanduplessis/apit.svg?style=social" alt="Github Watch Badge" />
  </a>
  <a href="https://github.com/tiaanduplessis/apit/stargazers">
    <img src="https://img.shields.io/github/stars/tiaanduplessis/apit.svg?style=social" alt="Github Star Badge" />
  </a>
  <a href="https://twitter.com/intent/tweet?text=Check%20out%20apit!%20https://github.com/tiaanduplessis/apit%20%F0%9F%91%8D">
    <img src="https://img.shields.io/twitter/url/https/github.com/tiaanduplessis/apit.svg?style=social" alt="Tweet" />
  </a>
</div>
<br>
<div align="center">
  Built with ❤︎ by <a href="https://github.com/tiaanduplessis">tiaanduplessis</a> and <a href="https://github.com/tiaanduplessis/apit/contributors">contributors</a>
</div>

<h2>Table of Contents</h2>
<details>
  <summary>Table of Contents</summary>
  <li><a href="#about">About</a></li>
  <li><a href="#install">Install</a></li>
  <li><a href="#usage">Usage</a></li>
  <li><a href="#caveats">Caveats</a></li>
  <li><a href="#contribute">Contribute</a></li>
  <li><a href="#license">License</a></li>
</details>


## About

The package takes `json` or plain `object` and turns it into a RESTful API server running on a given port (defaults to `8000`).


## Install

```sh
$ npm install apit
# OR
$ yarn add apit
```

Or to use as CLI:

```sh
$ npm -g install apit
# OR
$ yarn global add apit
```

## Usage

```js
const apit = require('apit')

const data = {
  posts: {
    foo: {
      message: 'hello'
    }
  },
  other: 'foo',
  baz: [1,2,3],
  food: {
    steal: {
      healthy: true
    }
  }
}

apit(data)
{"pid":54578,"hostname":"Tiaan-FF-Mac.local","name":"brewski","level":30,"time":1501775589826,"msg":"Server listening at http://localhost:3000","v":1}

```

The above example will create the following routes with associated values:

- **/** - {"posts":{"foo":{"message":"hello"}},"other":"foo","baz":[1,2,3],"food":{"steal":{"healthy":true}}}
- **/posts** - {"foo":{"message":"hello"}}
- **/posts/foo** - {"message":"hello"}
- **/posts/foo/message** - "hello"
- **/other** - "foo"
- **/baz** - [1,2,3]
- **/food** - {"steal":{"healthy":true}}
- **/food/steal** - {"healthy":true}
- **/food/steal/healthy** - true

If you install the module globally, you can also use it with a `json` file or module that exports a `object`:

```sh
apit --file=example.json
# {"pid":56017,"hostname":"Tiaan-FF-Mac.local","name":"brewski","level":30,"time":1501776268494,"msg":"Server listening at http://localhost:8000","v":1}
```

## Caveats

Currently only `GET` requests are supported.

## Contributing

Contributions are welcome!

1. Fork it.
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

Or open up [a issue](https://github.com/tiaanduplessis/apit/issues).

## License

Licensed under the MIT License.
