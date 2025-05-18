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

  db.get('SELECT * FROM articles WHERE id = ?', [id], (err, article) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!article) return res.status(404).json({ error: 'Not found' });

    // categoryIds を取得
    db.all('SELECT category_id FROM article_categories WHERE article_id = ?', [id], (err, categoryRows) => {
      if (err) return res.status(500).json({ error: err.message });

      const categoryIds = categoryRows.map(row => row.category_id);

      // tagIds を取得
      db.all('SELECT tag_id FROM article_tags WHERE article_id = ?', [id], (err, tagRows) => {
        if (err) return res.status(500).json({ error: err.message });

        const tagIds = tagRows.map(row => row.tag_id);

        // 最終レスポンス
        res.json({
          ...article,
          categoryIds,
          tagIds
        });
      });
    });
  });
});


// 記事の追加
router.post('/', (req, res) => {
  const { title, body, summary, is_published, status, categoryIds, tagIds, thumbnail } = req.body;

  db.serialize(() => {
    db.run(
      `INSERT INTO articles (title, body, summary, is_published, status, thumbnail)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, body, summary, is_published ? 1 : 0, status || 'draft', thumbnail || null],
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

router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { title, body, summary, is_published, status, thumbnail, categoryIds, tagIds } = req.body;

  db.serialize(() => {
    // 記事の基本情報更新
    db.run(
      `UPDATE articles SET title = ?, body = ?, summary = ?, is_published = ?, status = ?, thumbnail = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [title, body, summary, is_published ? 1 : 0, status, thumbnail || null, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Not found' });

        // カテゴリ紐づけの更新
        if (Array.isArray(categoryIds)) {
          // まず既存の紐づけ削除
          db.run('DELETE FROM article_categories WHERE article_id = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            if (categoryIds.length === 0) return; // 空なら挿入しない

            const stmt = db.prepare(`INSERT INTO article_categories (article_id, category_id) VALUES (?, ?)`);
            categoryIds.forEach(cid => stmt.run(id, cid));
            stmt.finalize();
          });
        }

        // タグ紐づけの更新
        if (Array.isArray(tagIds)) {
          db.run('DELETE FROM article_tags WHERE article_id = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            if (tagIds.length === 0) return;

            const stmt = db.prepare(`INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)`);
            tagIds.forEach(tid => stmt.run(id, tid));
            stmt.finalize();
          });
        }

        res.json({ message: 'Updated successfully' });
      }
    );
  });
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
