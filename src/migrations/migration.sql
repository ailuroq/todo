-- Таблица пользователей
CREATE TABLE IF NOT EXISTS "Users" (
    "userId" SERIAL PRIMARY KEY,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "avatar" TEXT,
    "role" VARCHAR(20) DEFAULT 'user',
    "points" INT DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица оригинальных планов (создаём до зависимых таблиц)
CREATE TABLE IF NOT EXISTS "OriginalPlans" (
    "planId" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "details" TEXT,
    "category" VARCHAR(50),
    "isPublic" BOOLEAN DEFAULT TRUE,
    "likesCount" INT DEFAULT 0,
    "version" INT DEFAULT 1,
    "mainImageLink" VARCHAR(2048),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица планов
CREATE TABLE IF NOT EXISTS "Plans" (
    "planId" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "details" TEXT,
    "category" VARCHAR(50),
    "isPublic" BOOLEAN DEFAULT TRUE,
    "likesCount" INT DEFAULT 0,
    "version" INT DEFAULT 1,
    "isActive" BOOLEAN DEFAULT FALSE,
    "originalPlanId" INT REFERENCES "OriginalPlans"("planId") ON DELETE SET NULL,
    "mainImageLink" VARCHAR(2048),
    "lastActivityDate" TIMESTAMPTZ DEFAULT NOW(),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица тегов
CREATE TABLE IF NOT EXISTS "Tags" (
    "tagId" SERIAL PRIMARY KEY,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT
);
ALTER TABLE "Tasks" ADD COLUMN "lastActivityDate" TIMESTAMPTZ DEFAULT NOW();

-- Таблица оригинальных задач
CREATE TABLE IF NOT EXISTS "OriginalTasks" (
    "taskId" SERIAL PRIMARY KEY,
    "planId" INT REFERENCES "OriginalPlans"("planId") ON DELETE CASCADE,
    "userId" INT REFERENCES "Users"("userId") ON DELETE SET NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "taskOrder" INT,
    "dayNumber" INT,
    "durationMinutes" INT,
    "isRepeating" BOOLEAN DEFAULT FALSE,
    "isMandatory" BOOLEAN DEFAULT FALSE,
    "isMeal" BOOLEAN DEFAULT FALSE,
    "repeatType" VARCHAR(50),
    "repeatDays" VARCHAR(50),
    "tagId" INT REFERENCES "Tags"("tagId") ON DELETE SET NULL,
    "startTime" TIME,
    "endTime" TIME,
    "status" VARCHAR(50) DEFAULT 'pending',
    "calories" DECIMAL(10, 2),
    "protein" DECIMAL(10, 2),
    "carbs" DECIMAL(10, 2),
    "fats" DECIMAL(10, 2),
    "mainImageLink" VARCHAR(2048),
    "tag" VARCHAR(2048),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица задач
CREATE TABLE IF NOT EXISTS "Tasks" (
    "taskId" SERIAL PRIMARY KEY,
    "planId" INT REFERENCES "Plans"("planId") ON DELETE CASCADE,
    "userId" INT REFERENCES "Users"("userId") ON DELETE SET NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "taskOrder" INT,
    "durationMinutes" INT,
    "isRepeating" BOOLEAN DEFAULT FALSE,
    "isMandatory" BOOLEAN DEFAULT FALSE,
    "isMeal" BOOLEAN DEFAULT FALSE,
    "repeatType" VARCHAR(50),
    "repeatDays" VARCHAR(50),
    "tagId" INT REFERENCES "Tags"("tagId") ON DELETE SET NULL,
    "startTime" TIME,
    "endTime" TIME,
    "status" VARCHAR(50) DEFAULT 'pending',
    "calories" DECIMAL(10, 2),
    "protein" DECIMAL(10, 2),
    "carbs" DECIMAL(10, 2),
    "fats" DECIMAL(10, 2),
    "date" DATE,
    "originalTaskId" INT REFERENCES "OriginalTasks"("taskId") ON DELETE SET NULL,
    "penaltyApplied" BOOLEAN DEFAULT FALSE,
    "mainImageLink" VARCHAR(2048),
    "tag" VARCHAR(2048),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица изображений
CREATE TABLE IF NOT EXISTS "Images" (
    "id" SERIAL PRIMARY KEY,
    "imageData" BYTEA NOT NULL,
    "originalPlanId" INT REFERENCES "OriginalPlans"("planId") ON DELETE CASCADE,
    "originalTaskId" INT REFERENCES "OriginalTasks"("taskId") ON DELETE CASCADE,
    "planId" INT REFERENCES "Plans"("planId") ON DELETE CASCADE,
    "taskId" INT REFERENCES "Tasks"("taskId") ON DELETE CASCADE,
    "userId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "imageType" VARCHAR(50),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Остальные таблицы (уведомления, достижения, прогресс и т.д.)
CREATE TABLE IF NOT EXISTS "Notifications" (
    "notificationId" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "planId" INT REFERENCES "Plans"("planId") ON DELETE SET NULL,
    "taskId" INT REFERENCES "Tasks"("taskId") ON DELETE SET NULL,
    "eventTime" TIMESTAMPTZ NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "isRead" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" SERIAL PRIMARY KEY,
    "userId" INT NOT NULL REFERENCES "Users"("userId") ON DELETE CASCADE,
    "feedbackText" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
