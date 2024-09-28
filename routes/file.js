const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');

const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', auth, upload.single('file'), (req, res) => {
  const { originalname, mimetype, size } = req.file;
  const fileData = {
    name: originalname,
    extension: originalname.split('.').pop(),
    mime: mimetype,
    size,
    uploadedAt: new Date(),
  };

  db.query('INSERT INTO files SET ?', fileData, (error) => {
    if (error) return res.status(500).send(error);
    res.status(201).send('File uploaded successfully');
  });
});

router.get('/list', auth, (req, res) => {
  const { page = 1, list_size = 10 } = req.query;
  const offset = (page - 1) * list_size;

  db.query(
    'SELECT * FROM files LIMIT ?, ?',
    [offset, list_size],
    (error, results) => {
      if (error) return res.status(500).send(error);
      res.json(results);
    }
  );
});

router.delete('/delete/:id', auth, (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM files WHERE id = ?', [id], (error) => {
    if (error) return res.status(500).send(error);
    res.sendStatus(204);
  });
});

router.get('/:id', auth, (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM files WHERE id = ?', [id], (error, results) => {
    if (error || results.length === 0) return res.sendStatus(404);
    res.json(results[0]);
  });
});

router.get('/download/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const [fileInfo] = await db.query('SELECT * FROM files WHERE id = ?', [id]);
    if (!fileInfo) {
      return res.status(404).json({ message: 'Файл не найден' });
    }

    const filePath = path.join(__dirname, '../uploads', fileInfo.file_name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Файл отсутствует на сервере' });
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileInfo.original_name}"`
    );
    res.setHeader('Content-Type', fileInfo.mime_type);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Ошибка при скачивании файла:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

router.put('/update/:id', auth, upload.single('file'), (req, res) => {
  const { id } = req.params;
  const { originalname, mimetype, size } = req.file;
  const fileData = {
    name: originalname,
    extension: originalname.split('.').pop(),
    mime: mimetype,
    size,
    uploadedAt: new Date(),
  };

  db.query('UPDATE files SET ? WHERE id = ?', [fileData, id], (error) => {
    if (error) return res.status(500).send(error);
    res.sendStatus(204);
  });
});

module.exports = router;
