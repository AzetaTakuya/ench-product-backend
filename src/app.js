const express = require('express')
const http = require('http')
const cors = require('cors') // corsパッケージをインポート
const setupStaticFiles = require('./static')

const app = express()
const port = 4000
// CORSを有効化
app.use(cors())
// JSONリクエストボディのパース
app.use(express.json())
// 静的ファイルの設定を適用
setupStaticFiles(app)

// APIルートを設定
const articlesAPI = require('./api/articles');
const categoryAPI = require('./api/categories');
const tagsAPI = require('./api/tags');
const fileAPI = require('./api/files');

app.use('/api/articles', articlesAPI);
app.use('/api/categories', categoryAPI);
app.use('/api/tags', tagsAPI);
app.use('/api/files', fileAPI);
// HTTPサーバーを作成
const server = http.createServer(app)

// HTTPルート
app.get('/', (req, res) => {
  res.send('Hello World!!!')
})

// サーバーを起動
server.listen(port, () => {
  console.log(`Example app listening on http://localhost:${port}`)
})