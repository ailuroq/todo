import cron from 'node-cron';
import moment from 'moment';

let cronJob = null; // Переменная для хранения запущенной задачи

export function startCronJobs(planRepository, userRepository) {
  cronJob = cron.schedule('*/10 * * * * *', async () => { // 🔄 Запуск каждый день в полночь
      console.log('🔍 Проверяем просроченные планы...');

      const today = moment().startOf('day').format('YYYY-MM-DD');

      try {
          const expiredPlans = await planRepository.getExpiredPlans(today);

          if (expiredPlans.length > 0) {
              for (const plan of expiredPlans) {
                  const incompleteTasks = await planRepository.getIncompleteTasks(plan.planId, today);
                  const penaltyPoints = incompleteTasks * 15;

                  if (penaltyPoints > 0) {
                      await userRepository.deductPoints(plan.userId, penaltyPoints);
                      await planRepository.markPenaltyAsApplied(plan.planId, today);
                      console.log(`❌ ${penaltyPoints} очков снято у пользователя ${plan.userId}`);
                  }

                  await planRepository.markPlanAsCompleted(plan.planId);
                  console.log(`✅ План ${plan.planId} завершен.`);
              }
              console.log(`🔄 Обработано ${expiredPlans.length} просроченных планов.`);
          } else {
              console.log('✅ Нет просроченных планов.');
          }
      } catch (error) {
          console.error('❌ Ошибка при проверке планов:', error);
      }
  }, {
      scheduled: true
  });
}

// Функция для остановки cron-задачи
export function stopCronJobs() {
  if (cronJob) {
    cronJob.stop();
    console.log('🛑 Cron-задача остановлена.');
  }
}

// Обработчики завершения процесса
process.on('SIGTERM', () => {
  console.log('SIGTERM получен, останавливаем cron-задачи...');
  stopCronJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT получен, останавливаем cron-задачи...');
  stopCronJobs();
  process.exit(0);
});
