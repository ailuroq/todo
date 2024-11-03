-- Таблица пользователей
CREATE TABLE "Users" (
    "userId" SERIAL PRIMARY KEY,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "avatar" TEXT,
    "role" VARCHAR(20) DEFAULT 'user',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица планов
CREATE TABLE "Plans" (
    "planId" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("userId"),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "details" TEXT,
    "category" VARCHAR(50),
    "isPublic" BOOLEAN DEFAULT TRUE,
    "likesCount" INT DEFAULT 0,
    "version" INT DEFAULT 1,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица тегов для задач
CREATE TABLE "Tags" (
    "tagId" SERIAL PRIMARY KEY,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT
);

-- Таблица задач
CREATE TABLE "Tasks" (
    "taskId" SERIAL PRIMARY KEY,
    "planId" INT REFERENCES "Plans"("planId") ON DELETE CASCADE,
    "userId" INT REFERENCES "Users"("userId") ON DELETE SET NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "taskOrder" INT,
    "durationMinutes" INT,
    "isRepeating" BOOLEAN DEFAULT FALSE,
    "isMandatory" BOOLEAN DEFAULT FALSE,
    "repeatType" VARCHAR(50),
    "repeatDays" VARCHAR(50),
    "tagId" INT REFERENCES "Tags"("tagId"),
    "startTime" TIME,
    "endTime" TIME,
    "status" VARCHAR(50) DEFAULT 'pending',
    "calories" DECIMAL(10, 2),
    "protein" DECIMAL(10, 2),
    "carbs" DECIMAL(10, 2),
    "fats" DECIMAL(10, 2),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OriginalPlans" (
    "planId" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("userId"),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "details" TEXT,
    "category" VARCHAR(50),
    "isPublic" BOOLEAN DEFAULT TRUE,
    "likesCount" INT DEFAULT 0,
    "version" INT DEFAULT 1,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OriginalTasks" (
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
    "repeatType" VARCHAR(50),
    "repeatDays" VARCHAR(50),
    "tagId" INT REFERENCES "Tags"("tagId"),
    "startTime" TIME,
    "endTime" TIME,
    "status" VARCHAR(50) DEFAULT 'pending',
    "calories" DECIMAL(10, 2),
    "protein" DECIMAL(10, 2),
    "carbs" DECIMAL(10, 2),
    "fats" DECIMAL(10, 2),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица уведомлений
CREATE TABLE "Notifications" (
    "notificationId" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "planId" INT REFERENCES "Plans"("planId"),
    "taskId" INT REFERENCES "Tasks"("taskId"),
    "eventTime" TIMESTAMP NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "isRead" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица достижений (общие достижения, например, 10 дней подряд)
CREATE TABLE "Achievements" (
    "achievementId" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "conditionType" VARCHAR(50),
    "requiredValue" INT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица достижений пользователей
CREATE TABLE "UserAchievements" (
    "userAchievementId" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "achievementId" INT REFERENCES "Achievements"("achievementId") ON DELETE CASCADE,
    "achievedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица лайков за выполнение плана
CREATE TABLE "Likes" (
    "likeId" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "planId" INT REFERENCES "Plans"("planId") ON DELETE CASCADE,
    "likeType" VARCHAR(20) DEFAULT 'plan',
    "likeDate" DATE NOT NULL,
    UNIQUE("userId", "planId", "likeDate"),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица замороженных лайков для планов
CREATE TABLE "FrozenLikes" (
    "frozenLikeId" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "planId" INT REFERENCES "Plans"("planId") ON DELETE CASCADE,
    "freezeStartDate" DATE NOT NULL,
    "freezeEndDate" DATE,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица прогресса по выполнению обязательных задач плана
CREATE TABLE "PlanProgress" (
    "progressId" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "planId" INT REFERENCES "Plans"("planId") ON DELETE CASCADE,
    "progressDate" DATE NOT NULL,
    "completedTasksCount" INT DEFAULT 0,
    "mandatoryTasksCount" INT DEFAULT 0,
    "allTasksCompleted" BOOLEAN DEFAULT FALSE,
    "planStatus" VARCHAR(20) DEFAULT 'in-progress',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", "planId", "progressDate")
);

-- Таблица выполнения задач пользователями
CREATE TABLE "TaskCompletion" (
    "completionId" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "taskId" INT REFERENCES "Tasks"("taskId") ON DELETE CASCADE,
    "completedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) DEFAULT 'completed'
);

-- Таблица подписок пользователей на планы
CREATE TABLE "UserSubscriptions" (
    "subscriptionId" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "planId" INT REFERENCES "Plans"("planId"),
    "subscriptionType" VARCHAR(50),
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица активности пользователей
CREATE TABLE "ActivityTracker" (
    "activityId" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "planId" INT REFERENCES "Plans"("planId"),
    "activityDate" DATE NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица вызовов/челленджей между пользователями
CREATE TABLE "Challenges" (
    "challengeId" SERIAL PRIMARY KEY,
    "creatorUserId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "targetUserId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "planId" INT REFERENCES "Plans"("planId"),
    "description" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" VARCHAR(20) DEFAULT 'pending',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица друзей/подписчиков пользователей
CREATE TABLE "Friends" (
    "friendshipId" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "friendId" INT REFERENCES "Users"("userId") ON DELETE CASCADE,
    "status" VARCHAR(20) DEFAULT 'pending',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", "friendId")
);
