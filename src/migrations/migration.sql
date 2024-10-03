-- Таблица пользователей
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица планов
CREATE TABLE Plans (
    plan_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    public BOOLEAN DEFAULT TRUE,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица задач
CREATE TABLE Tasks (
    task_id SERIAL PRIMARY KEY,
    plan_id INT REFERENCES Plans(plan_id) ON DELETE CASCADE,
    user_id INT REFERENCES Users(user_id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    "order" INT,
    duration_minutes INT,
    repeating BOOLEAN DEFAULT FALSE,
    mandatory BOOLEAN DEFAULT FALSE,  -- Флаг обязательной задачи
    tag VARCHAR(50),
    calories DECIMAL(10, 2),
    protein DECIMAL(10, 2),
    carbs DECIMAL(10, 2),
    fats DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица уведомлений
CREATE TABLE Notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    plan_id INT REFERENCES Plans(plan_id),
    event_time TIMESTAMP NOT NULL,
    type VARCHAR(50) NOT NULL,  -- Тип уведомления (например, "пропущенное событие", "достижение")
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица тегов для задач
CREATE TABLE Tags (
    tag_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT
);

-- Таблица достижений (общие достижения, например, 10 дней подряд)
CREATE TABLE Achievements (
    achievement_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,  -- Название достижения (например, "10 дней подряд")
    description TEXT NOT NULL,   -- Описание достижения
    condition_type VARCHAR(50),  -- Тип условия (например, "дни подряд", "месяц подряд")
    required_value INT NOT NULL, -- Значение условия (например, 10 дней или 30 дней)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица достижений пользователей
CREATE TABLE User_Achievements (
    user_achievement_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    achievement_id INT REFERENCES Achievements(achievement_id) ON DELETE CASCADE,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Дата, когда достижение было получено
);

-- Таблица лайков за выполнение плана
CREATE TABLE Likes (
    like_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    plan_id INT REFERENCES Plans(plan_id) ON DELETE CASCADE,
    like_date DATE NOT NULL,  -- Дата, когда был начислен лайк
    UNIQUE(user_id, plan_id, like_date),  -- Пользователь может получить только один лайк за план в день
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица замороженных лайков для планов
CREATE TABLE Frozen_Likes (
    frozen_like_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    plan_id INT REFERENCES Plans(plan_id) ON DELETE CASCADE,
    freeze_start_date DATE NOT NULL,  -- Дата начала заморозки
    freeze_end_date DATE,  -- Дата окончания заморозки, может быть NULL (если пользователь не указал конкретную дату)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица прогресса по выполнению обязательных задач плана
CREATE TABLE Plan_Progress (
    progress_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    plan_id INT REFERENCES Plans(plan_id) ON DELETE CASCADE,
    progress_date DATE NOT NULL,  -- Дата, за которую отслеживается прогресс
    completed_tasks_count INT DEFAULT 0,  -- Количество выполненных задач за день
    mandatory_tasks_count INT DEFAULT 0,  -- Количество обязательных задач в плане за день
    all_tasks_completed BOOLEAN DEFAULT FALSE,  -- Логический флаг, выполнены ли все обязательные задачи
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, plan_id, progress_date)  -- Прогресс по плану уникален для одного дня
);
