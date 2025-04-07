import { Telegraf } from 'telegraf';
import { Weight } from './models/weight';
import { connectDB } from '../services/database';
import { Scheduler } from '../services/scheduler';
import 'dotenv/config';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const scheduler = new Scheduler(bot);

// Подключение к базе данных
connectDB();

// Обработчик команды /start
bot.start(async (ctx) => {
    await ctx.reply(
        'Привет! Я бот для отслеживания веса. Каждое утро я буду спрашивать твой вес и предоставлять статистику.'
    );

    // Устанавливаем ежедневные напоминания
    scheduler.setupDailyReminder(ctx.from.id);

    // Устанавливаем еженедельные отчеты (каждое воскресенье)
    const now = new Date();
    const nextSunday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + (7 - now.getDay()),
        12, 0, 0
    );

    const timeUntilSunday = nextSunday.getTime() - now.getTime();

    setTimeout(() => {
        scheduler.sendWeeklyReport(ctx.from.id);
        setInterval(() => scheduler.sendWeeklyReport(ctx.from.id), 7 * 24 * 60 * 60 * 1000);
    }, timeUntilSunday);
});

// Обработчик ввода веса
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    // Проверяем, является ли сообщение числом (весом)
    const weight = parseFloat(text.replace(',', '.'));

    if (isNaN(weight)) {
        await ctx.reply('Пожалуйста, введите вес в килограммах (например: 75.5)');
        return;
    }

    try {
        // Сохраняем вес в базу данных
        const newWeight = new Weight({
            userId,
            weight,
            date: new Date()
        });

        await newWeight.save();

        // Получаем предыдущий вес
        const previousWeight = await Weight.findOne({
            userId,
            date: { $lt: new Date() }
        }).sort({ date: -1 });

        if (previousWeight) {
            const difference = weight - previousWeight.weight;
            let message = `Ваш вес сохранен: ${weight} кг\n`;
            message += `Разница с предыдущим днем: ${difference > 0 ? '+' : ''}${difference.toFixed(1)} кг`;

            await ctx.reply(message);
        } else {
            await ctx.reply(`Ваш вес сохранен: ${weight} кг\nЭто ваша первая запись.`);
        }
    } catch (error) {
        console.error('Error saving weight:', error);
        await ctx.reply('Произошла ошибка при сохранении вашего веса.');
    }
});

// Запуск бота
bot.launch().then(() => {
    console.log('Bot started');
});

// Обработка завершения работы
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));