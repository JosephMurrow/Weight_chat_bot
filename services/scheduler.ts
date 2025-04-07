import { Weight } from '../src/models/weight';
import { Telegraf } from 'telegraf';

export class Scheduler {
    private bot: Telegraf;

    constructor(bot: Telegraf) {
        this.bot = bot;
    }

    public async setupDailyReminder(userId: number) {
        // Устанавливаем напоминание на 9 утра
        const now = new Date();
        const targetTime = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            9, 0, 0
        );

        if (now > targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }

        const timeUntilFirstReminder = targetTime.getTime() - now.getTime();

        setTimeout(() => {
            this.sendDailyQuestion(userId);
            // Устанавливаем повтор каждый день
            setInterval(() => this.sendDailyQuestion(userId), 24 * 60 * 60 * 1000);
        }, timeUntilFirstReminder);
    }

    private async sendDailyQuestion(userId: number) {
        try {
            await this.bot.telegram.sendMessage(
                userId,
                'Доброе утро! Пожалуйста, введите ваш текущий вес в килограммах:'
            );
        } catch (error) {
            console.error('Error sending daily question:', error);
        }
    }

    public async sendWeeklyReport(userId: number) {
        try {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            const weights = await Weight.find({
                userId,
                date: { $gte: oneWeekAgo }
            }).sort({ date: 1 });

            if (weights.length < 2) {
                await this.bot.telegram.sendMessage(
                    userId,
                    'Недостаточно данных для формирования недельного отчета.'
                );
                return;
            }

            const firstWeight = weights[0].weight;
            const lastWeight = weights[weights.length - 1].weight;
            const difference = lastWeight - firstWeight;

            let message = '📊 Недельный отчет по весу:\n\n';
            message += `Начальный вес: ${firstWeight} кг\n`;
            message += `Конечный вес: ${lastWeight} кг\n`;
            message += `Изменение: ${difference > 0 ? '+' : ''}${difference.toFixed(1)} кг\n\n`;

            if (difference > 0) {
                message += 'Вы набрали вес за неделю.';
            } else if (difference < 0) {
                message += 'Вы потеряли вес за неделю! Отличная работа!';
            } else {
                message += 'Ваш вес остался неизменным.';
            }

            await this.bot.telegram.sendMessage(userId, message);
        } catch (error) {
            console.error('Error sending weekly report:', error);
        }
    }
}