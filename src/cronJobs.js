import cron from 'node-cron';
import moment from 'moment';

export function startCronJobs(planRepository, userRepository) {
  cron.schedule('0 0 * * *', async () => { // 🔄 Запуск каждые 30 секунд для тестов
      console.log('🔍 Проверяем просроченные планы...');

      const today = moment().startOf('day').format('YYYY-MM-DD');

      try {
          const expiredPlans = await planRepository.getExpiredPlans(today);

          if (expiredPlans.length > 0) {
              for (const plan of expiredPlans) {
                  // 🔵 Получаем количество НЕ выполненных задач (ТОЛЬКО ПРОШЛЫЕ и без штрафа)
                  const incompleteTasks = await planRepository.getIncompleteTasks(plan.planId, today);
                  const penaltyPoints = incompleteTasks * 15;

                  // ⛔ Если есть невыполненные задачи – штрафуем и помечаем штраф
                  if (penaltyPoints > 0) {
                      await userRepository.deductPoints(plan.userId, penaltyPoints);
                      await planRepository.markPenaltyAsApplied(plan.planId, today);
                      console.log(`❌ ${penaltyPoints} очков снято у пользователя ${plan.userId}`);
                  }

                  // ✅ Завершаем просроченный план
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
  });
}

