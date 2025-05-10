require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const app = express();
const port = process.env.PORT || 3000;

// Подключение к PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER || 'mafia_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'mafia_db',
    password: process.env.DB_PASSWORD || 'your_password',
    port: process.env.DB_PORT || 5432,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Проверка подключения к БД
(async () => {
    try {
        await pool.query('SELECT NOW()');
        console.log('Подключение к PostgreSQL установлено');
    } catch (err) {
        console.error('Ошибка подключения к PostgreSQL:', err);
        process.exit(1);
    }
})();

// Маршруты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Регистрация
app.post('/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // Валидация
        if (!username?.trim() || !password?.trim() || !email?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Все поля обязательны для заполнения'
            });
        }

        // Проверка существующего пользователя
        const userExists = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username.trim(), email.trim()]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь с таким логином или email уже существует'
            });
        }

        // Хэширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Сохранение в БД
        const newUser = await pool.query(
            `INSERT INTO users (username, password, email) 
             VALUES ($1, $2, $3) 
             RETURNING id, username, email`,
            [username.trim(), hashedPassword, email.trim()]
        );

        res.json({
            success: true,
            message: 'Регистрация успешно завершена!',
            user: newUser.rows[0]
        });

    } catch (err) {
        console.error('Ошибка регистрации:', err);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Авторизация
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username?.trim() || !password?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Логин и пароль обязательны'
            });
        }

        // Поиск пользователя
        const result = await pool.query(
            'SELECT id, username, password FROM users WHERE username = $1',
            [username.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Неверный логин или пароль'
            });
        }

        const user = result.rows[0];

        // Проверка пароля
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Неверный логин или пароль'
            });
        }

        // Успешная авторизация
        res.json({
            success: true,
            message: 'Авторизация успешна!',
            user: {
                id: user.id,
                username: user.username
            }
        });

    } catch (err) {
        console.error('Ошибка авторизации:', err);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await pool.end();
    process.exit();
});