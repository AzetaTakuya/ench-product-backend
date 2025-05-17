const express = require('express')

module.exports = (app) => {
  // 静的ファイルを提供
  app.use(express.static('public'))
}