const express = require('express');
const router = express.Router();
const db = require('../db');

// タグ一覧取得
router.get('/', (req, res) => {
  db.all('SELECT * FROM tags', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// タグ追加
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'タグ名は必須です。' });

  db.run('INSERT INTO tags (name) VALUES (?)', [name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name });
  });
});

// タグ更新
router.put('/:id', (req, res) => {
  const { name } = req.body;
  const { id } = req.params;
  if (!name) return res.status(400).json({ error: 'タグ名は必須です。' });

  db.run('UPDATE tags SET name = ? WHERE id = ?', [name, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'タグが見つかりません。' });
    res.json({ id, name });
  });
});

// タグ削除
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM tags WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'タグが見つかりません。' });
    res.json({ message: 'タグを削除しました。' });
  });
});

module.exports = router;
