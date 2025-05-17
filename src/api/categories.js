const express = require('express');
const router = express.Router();
const db = require('../db');

// カテゴリ一覧取得
router.get('/', (req, res) => {
  db.all('SELECT * FROM categories', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// カテゴリ追加
router.post('/', (req, res) => {
  const { name, parent_id = null } = req.body;
  if (!name) return res.status(400).json({ error: 'カテゴリ名は必須です。' });

  db.run('INSERT INTO categories (name, parent_id) VALUES (?, ?)', [name, parent_id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name, parent_id });
  });
});

// カテゴリ更新
router.put('/:id', (req, res) => {
  const { name, parent_id = null } = req.body;
  const { id } = req.params;

  if (!name) return res.status(400).json({ error: 'カテゴリ名は必須です。' });

  db.run(
    'UPDATE categories SET name = ?, parent_id = ? WHERE id = ?',
    [name, parent_id, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'カテゴリが見つかりません。' });
      res.json({ id, name, parent_id });
    }
  );
});


// カテゴリ削除
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM categories WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'カテゴリが見つかりません。' });
    res.json({ message: 'カテゴリを削除しました。' });
  });
});

module.exports = router;
