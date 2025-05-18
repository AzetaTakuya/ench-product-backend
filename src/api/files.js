const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db'); // SQLite接続

const router = express.Router();

const uploadDir = path.join(__dirname, '../public');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ストレージ設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = uuidv4() + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

/**
 * POST /api/upload
 * ファイルをアップロードし、DBに保存
 */
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'ファイルがアップロードされていません。' });
  }

  const { originalname, filename, mimetype, size } = req.file;
  const fileUrl = `/public/${filename}`;

  const _originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

  const sql = `
    INSERT INTO uploaded_files (original_name, stored_name, mime_type, size, url)
    VALUES (?, ?, ?, ?, ?)
  `;
  const values = [_originalname, filename, mimetype, size, fileUrl];

  db.run(sql, values, function (err) {
    if (err) {
      return res.status(500).json({ error: 'DB保存エラー', details: err });
    }

    res.status(201).json({
      message: 'ファイルがアップロードされました。',
      id: this.lastID,
      filename,
      url: fileUrl
    });
  });
});

/**
 * GET /api/upload
 * アップロード済みファイルの一覧を取得
 */
router.get('/', (req, res) => {
  const sql = 'SELECT id, original_name, stored_name, mime_type, size, url, uploaded_at FROM uploaded_files ORDER BY uploaded_at DESC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'DB取得エラー', details: err });
    }
    res.json({ files: rows });
  });
});


/**
 * DELETE /api/upload/:id
 * ファイルを削除し、DBからも削除
 */
router.delete('/:id', (req, res) => {
  const id = req.params.id;

  db.get('SELECT * FROM uploaded_files WHERE id = ?', [id], (err, file) => {
    if (err) {
      return res.status(500).json({ error: 'DB取得エラー', details: err });
    }
    if (!file) {
      return res.status(404).json({ error: 'ファイルが見つかりません。' });
    }

    const filePath = path.join(uploadDir, file.stored_name);

    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        return res.status(500).json({ error: 'ファイル削除に失敗しました。', details: err });
      }

      db.run('DELETE FROM uploaded_files WHERE id = ?', [id], (err) => {
        if (err) {
          return res.status(500).json({ error: 'DBからの削除に失敗しました。', details: err });
        }

        res.json({ message: 'ファイルを削除しました。' });
      });
    });
  });
});

module.exports = router;
