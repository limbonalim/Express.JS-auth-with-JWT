const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth')

const router = express.Router();

const blacklistedTokens = new Set();
const addToBlacklist = (token) => {
  blacklistedTokens.add(token);
};
const isBlacklisted = (token) => blacklistedTokens.has(token);

const generateTokens = (user) => {
  const accessToken = jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: '10m',
  });
  const refreshToken = jwt.sign(user, process.env.JWT_SECRET);
  return { accessToken, refreshToken };
};

router.post('/signup', async (req, res) => {
  const { id, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  db.query(
    'INSERT INTO users (id, password) VALUES (?, ?)',
    [id, hashedPassword],
    (error) => {
      if (error) return res.status(500).send(error);
      const tokens = generateTokens({ id });
      res.json(tokens);
    }
  );
});

router.post('/signin', async (req, res) => {
  const { id, password } = req.body;

  db.query('SELECT * FROM users WHERE id = ?', [id], async (error, results) => {
    if (error || results.length === 0)
      return res.status(403).send('Invalid credentials');

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(403).send('Invalid credentials');

    const tokens = generateTokens({ id });
    res.json(tokens);
  });
});

router.post('/signin/new_token', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.sendStatus(403);

  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    const tokens = generateTokens({ id: user.id });
    res.json(tokens);
  });
});

router.get('/logout', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Токен не найден' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.decode(token);

    if (!decoded) {
      return res.status(401).json({ message: 'Невалидный токен' });
    }

    addToBlacklist(token);

    res.sendStatus(204);
  } catch (error) {
    console.error('Ошибка при выходе:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Неавторизован' });
  }

  const token = authHeader.split(' ')[1];

  if (isBlacklisted(token)) {
    return res.status(403).json({ message: 'Токен заблокирован' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Невалидный токен' });
  }
};

router.get('/info', auth, (req, res) => {
  res.json({ id: req.user.id });
});

module.exports = router;
