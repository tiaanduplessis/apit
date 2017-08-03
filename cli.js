#!/usr/bin/env node
'use strict'

const path =require('path')

const args = require('get-them-args')()
const apit = require('./')


function init() {
  const { file, port = 8000 } = args

  if (!file) {
    console.error('No file name provided')
  }

  let filePath = path.resolve(file)

  if (filePath) {
    const obj = require(filePath)
    apit(obj, args.port || 8000)
  } else {
    console.error(`Could not resolve: ${file}`)
  }
}

init()
