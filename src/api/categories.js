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

// カテゴリ内一覧取得
router.get('/children', (req, res) => {
  const parentId = req.query.parent_id;
  let sql, params;

  if (parentId === 'null' || parentId === undefined) {
    // parent_id IS NULL のルートカテゴリを取得
    sql = 'SELECT * FROM categories WHERE parent_id IS NULL';
    params = [];
  } else {
    // parent_id = ? の子カテゴリを取得
    sql = 'SELECT * FROM categories WHERE parent_id = ?';
    params = [parentId];
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// カテゴリ追加
router.post('/', (req, res) => {
  const { name, parent_id = null, icon = null } = req.body;  // iconも受け取る
  if (!name) return res.status(400).json({ error: 'カテゴリ名は必須です。' });

  db.run(
    'INSERT INTO categories (name, parent_id, icon) VALUES (?, ?, ?)',
    [name, parent_id, icon],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, name, parent_id, icon });
    }
  );
});

// カテゴリ更新
router.put('/:id', (req, res) => {
  const { name, parent_id = null, icon = null } = req.body;  // iconも受け取る
  const { id } = req.params;

  if (!name) return res.status(400).json({ error: 'カテゴリ名は必須です。' });

  db.run(
    'UPDATE categories SET name = ?, parent_id = ?, icon = ? WHERE id = ?',
    [name, parent_id, icon, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'カテゴリが見つかりません。' });
      res.json({ id, name, parent_id, icon });
    }
  );
});

function getAllChildCategoryIds(parentId, callback) {
  const allIds = [parentId];
  function findChildren(ids) {
    db.all(`SELECT id FROM categories WHERE parent_id IN (${ids.map(() => '?').join(',')})`, ids, (err, rows) => {
      if (err) return callback(err);

      if (rows.length === 0) {
        return callback(null, allIds);
      }

      const childIds = rows.map(r => r.id);
      allIds.push(...childIds);
      findChildren(childIds);
    });
  }
  findChildren([parentId]);
}

// カテゴリ削除
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  getAllChildCategoryIds(id, (err, idsToDelete) => {
    if (err) return res.status(500).json({ error: err.message });

    if (idsToDelete.length === 0) {
      return res.status(404).json({ error: 'カテゴリが見つかりません。' });
    }

    const placeholders = idsToDelete.map(() => '?').join(',');
    db.run(`DELETE FROM categories WHERE id IN (${placeholders})`, idsToDelete, function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'カテゴリが見つかりません。' });
      res.json({ message: `${this.changes} 件のカテゴリを削除しました。` });
    });
  });
});


module.exports = router;
