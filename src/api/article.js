const express = require('express');
const router = express.Router();
const db = require('../db');

// 全記事を取得
router.get('/', (req, res) => {
  db.all('SELECT * FROM articles', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 単一記事を取得
router.get('/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM articles WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

// 記事の追加
router.post('/', (req, res) => {
  const { title, body, summary, is_published, status, categoryIds, tagIds } = req.body;

  db.serialize(() => {
    db.run(
      `INSERT INTO articles (title, body, summary, is_published, status)
       VALUES (?, ?, ?, ?, ?)`,
      [title, body, summary, is_published ? 1 : 0, status || 'draft'],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        const articleId = this.lastID;

        // カテゴリの紐づけ
        if (Array.isArray(categoryIds)) {
          const stmt = db.prepare(`INSERT INTO article_categories (article_id, category_id) VALUES (?, ?)`);
          categoryIds.forEach(cid => stmt.run(articleId, cid));
          stmt.finalize();
        }

        // タグの紐づけ
        if (Array.isArray(tagIds)) {
          const stmt = db.prepare(`INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)`);
          tagIds.forEach(tid => stmt.run(articleId, tid));
          stmt.finalize();
        }

        res.status(201).json({ id: articleId });
      }
    );
  });
});


// 記事の更新
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { title, body, summary, is_published, status } = req.body;
  db.run(
    `UPDATE articles SET title = ?, body = ?, summary = ?, is_published = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [title, body, summary, is_published ? 1 : 0, status, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Updated successfully' });
    }
  );
});

// 記事の削除
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM articles WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  });
});

module.exports = router;
