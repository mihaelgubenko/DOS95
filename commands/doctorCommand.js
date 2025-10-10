// DOCTOR - AI психотерапевт на базе GPT-4O
const OpenAI = require('openai');

// Инициализация OpenAI клиента
let openai = null;

function initOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai !== null;
}

const DOCTOR_SYSTEM_PROMPT = `Ты - ELIZA, классический AI психотерапевт Роджерианской школы, созданный в 1960-х годах.

Твоя роль:
- Будь эмпатичным и внимательным слушателем
- Задавай открытые вопросы, чтобы пациент говорил больше
- Перефразируй слова пациента в вопросы
- Используй фразы в стиле: "Расскажите мне больше об этом", "Почему вы так думаете?", "Как вы себя чувствуете?"
- Не давай прямых советов, а помогай пациенту самому найти ответы
- Будь профессиональным, но дружелюбным
- Отвечай кратко (2-3 предложения максимум)
- Используй стиль классической ELIZA, но с современным пониманием психологии

Важно: Ты работаешь в ретро DOS терминале, поэтому общайся на русском языке в стиле текстовых консультаций.`;

const doctorCommand = {
  // Начало сеанса
  start: async (args, session) => {
    if (!initOpenAI()) {
      // Fallback на простую ELIZA без AI
      session.doctorMode = true;
      session.elizaMemory = []; // Стек памяти для отложенных фраз
      return {
        output: `
╔═══════════════════════════════════════════════════╗
║      ELIZA - Виртуальный Психотерапевт            ║
║      Классическая версия (OpenAI недоступен)      ║
╚═══════════════════════════════════════════════════╝

Здравствуйте. Я ваш психотерапевт.
Расскажите мне о своих проблемах.

(Введите QUIT для выхода)

`
      };
    }

    session.doctorMode = true;
    session.doctorHistory = [];

    return {
      output: `
╔═══════════════════════════════════════════════════╗
║      ELIZA - AI Психотерапевт (GPT-4O)            ║
║      Виртуальная терапевтическая сессия           ║
╚═══════════════════════════════════════════════════╝

Здравствуйте. Я ваш AI психотерапевт.
Расскажите мне, что вас беспокоит.

(Введите QUIT для выхода)

`
    };
  },

  // Диалог с AI
  chat: async (message, session) => {
    if (!openai) {
      // Простая ELIZA без AI
      return simpleEliza(message, session);
    }

    try {
      // Добавить сообщение пользователя в историю
      session.doctorHistory.push({
        role: 'user',
        content: message
      });

      // Ограничить историю последними 10 сообщениями
      const recentHistory = session.doctorHistory.slice(-10);

      // Запрос к GPT-4O
      const completion = await openai.chat.completions.create({
        model: process.env.GPT_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: DOCTOR_SYSTEM_PROMPT },
          ...recentHistory
        ],
        temperature: 0.8,
        max_tokens: 200
      });

      const response = completion.choices[0].message.content;

      // Добавить ответ в историю
      session.doctorHistory.push({
        role: 'assistant',
        content: response
      });

      return {
        output: `\nDOCTOR> ${response}\n\n`
      };

    } catch (error) {
      console.error('OpenAI API Error:', error.message);
      
      // Fallback на простую ELIZA
      return {
        output: `\n[Ошибка подключения к AI. Используется классическая ELIZA]\n\nDOCTOR> ${simpleEliza(message).output}`
      };
    }
  }
};

// Трансформация местоимений (как в оригинальной ELIZA)
function transformPronouns(text) {
  const replacements = {
    'я': 'вы',
    'меня': 'вас',
    'мне': 'вам',
    'мной': 'вами',
    'мною': 'вами',
    'мой': 'ваш',
    'моя': 'ваша',
    'моё': 'ваше',
    'мои': 'ваши',
    'моего': 'вашего',
    'моей': 'вашей',
    'моих': 'ваших',
    'моему': 'вашему',
    'моим': 'вашим',
    'мне': 'вам',
    'со мной': 'с вами',
    'обо мне': 'о вас',
    'у меня': 'у вас',
  };

  let transformed = ' ' + text.toLowerCase() + ' ';
  
  for (const [from, to] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${from}\\b`, 'gi');
    transformed = transformed.replace(regex, to);
  }
  
  return transformed.trim();
}

// Простая ELIZA без AI (fallback) - расширенная версия с памятью и весами
function simpleEliza(message, session) {
  const input = message.toLowerCase();

  // Инициализация памяти если её нет
  if (!session.elizaMemory) {
    session.elizaMemory = [];
  }

  // Паттерны с весами (priority) - чем выше вес, тем выше приоритет
  // Сортируются по priority перед обработкой
  const patterns = [
    // ========== ПРИОРИТЕТ 10 - Критические темы ==========
    { 
      priority: 10,
      regex: /(.*)?(суицид|самоубийство|убить себя|покончить с собой)(.+)?/i,
      responses: [
        'Я понимаю, что вам очень тяжело. Пожалуйста, обратитесь за профессиональной помощью.',
        'Это серьёзная ситуация. Рекомендую немедленно связаться со специалистом.'
      ]
    },
    
    // ========== ПРИОРИТЕТ 9 - Семья ==========
    { 
      priority: 9,
      regex: /(.*)?(мама|мать|отец|папа|родители)(.+)?/i, 
      saveToMemory: true,
      responses: [
        'Расскажите больше о вашей семье.',
        'Как складываются ваши отношения с родителями?',
        'Что вы чувствуете, когда думаете о своих родителях?'
      ]
    },
    {
      priority: 9,
      regex: /(.*)?(брат|сестра|братья|сёстры|сибс)(.+)?/i,
      responses: [
        'Расскажите о ваших братьях или сёстрах.',
        'Какие у вас отношения с братом/сестрой?'
      ]
    },
    
    // ========== ПРИОРИТЕТ 8 - Сны и мечты ==========
    { 
      priority: 8,
      regex: /(.*)?(сон|снится|приснилось|мечта|мечтаю)(.+)?/i,
      saveToMemory: true,
      responses: [
        'Что этот сон может означать для вас?',
        'Расскажите подробнее об этом сне.',
        'Как часто вам это снится?',
        'Интересно. Что вы чувствовали во сне?'
      ]
    },
    
    // ========== ПРИОРИТЕТ 7 - Сильные эмоции ==========
    {
      priority: 7,
      regex: /(.*)?(ненавижу|ненависть|презираю)(.+)?/i,
      saveToMemory: true,
      responses: [
        'Почему вы испытываете такую сильную ненависть?',
        'Что привело к таким чувствам?',
        'Расскажите, что вызывает эту ненависть.'
      ]
    },
    {
      priority: 7,
      regex: /(.*)?(люблю|любовь|влюблён|влюблена)(.+)?/i,
      saveToMemory: true,
      responses: [
        'Расскажите больше об этом чувстве.',
        'Что это за человек?',
        'Как давно вы так чувствуете?'
      ]
    },
    {
      priority: 7,
      regex: /(.*)?(боюсь|страх|пугает|ужас)(.+)?/i,
      saveToMemory: true,
      responses: [
        'Чего именно вы боитесь?',
        'Что вызывает этот страх?',
        'Как давно вы испытываете этот страх?'
      ]
    },
    
    // ========== ПРИОРИТЕТ 6 - Работа и учёба ==========
    {
      priority: 6,
      regex: /(.*)?(работа|начальник|коллега|офис|увольнение)(.+)?/i,
      responses: [
        'Расскажите о вашей работе.',
        'Что именно беспокоит вас на работе?',
        'Как давно возникли эти проблемы на работе?'
      ]
    },
    {
      priority: 6,
      regex: /(.*)?(учёба|школа|университет|экзамен|учитель|преподаватель)(.+)?/i,
      responses: [
        'Расскажите о вашей учёбе.',
        'Что вас беспокоит в учёбе?'
      ]
    },
    
    // ========== ПРИОРИТЕТ 5 - Отношения ==========
    {
      priority: 5,
      regex: /(.*)?(друг|подруга|дружба|друзья)(.+)?/i,
      responses: [
        'Расскажите о ваших друзьях.',
        'Как складываются ваши дружеские отношения?'
      ]
    },
    {
      priority: 5,
      regex: /(.*)?(муж|жена|парень|девушка|партнёр|отношения)(.+)?/i,
      responses: [
        'Расскажите о ваших отношениях.',
        'Как давно вы вместе?',
        'Что именно беспокоит вас в отношениях?'
      ]
    },
    
    // ========== ПРИОРИТЕТ 4 - Трансформируемые фразы ==========
    { 
      priority: 4,
      regex: /я (чувствую|ощущаю) (.+)/i,
      transform: true,
      template: 'Почему вы чувствуете $2?'
    },
    {
      priority: 4,
      regex: /я (хочу|желаю) (.+)/i,
      transform: true,
      saveToMemory: true,
      template: 'Почему вы хотите $2?'
    },
    {
      priority: 4,
      regex: /я (не могу|не способен|не умею) (.+)/i,
      transform: true,
      responses: [
        'Почему вы думаете, что не можете $2?',
        'Что мешает вам $2?'
      ]
    },
    {
      priority: 4,
      regex: /я ([а-яё]+)(.*)/i,
      transform: true,
      template: 'Расскажите подробнее, почему вы $1$2?'
    },
    {
      priority: 4,
      regex: /(меня|мне) (.+)/i,
      transform: true,
      template: 'Почему $1 $2?'
    },
    {
      priority: 4,
      regex: /мой (.+) (.+)/i,
      transform: true,
      template: 'Ваш $1 $2? Расскажите подробнее.'
    },
    
    // ========== ПРИОРИТЕТ 3 - Негативные эмоции ==========
    { 
      priority: 3,
      regex: /(.*)?(грустно|печально|плохо|больно|тревожно|устал|устала|депрессия|тоска)(.+)?/i,
      saveToMemory: true,
      responses: [
        'Мне жаль это слышать. Расскажите, что привело к этому?',
        'Как давно вы так себя чувствуете?',
        'Что вас так огорчает?'
      ]
    },
    {
      priority: 3,
      regex: /(.*)?(одинок|одиноко|одиночество|никому не нужен)(.+)?/i,
      responses: [
        'Почему вы чувствуете себя одиноким?',
        'Расскажите об этом чувстве одиночества.'
      ]
    },
    {
      priority: 3,
      regex: /(.*)?(злость|злой|злая|раздражение|бесит)(.+)?/i,
      responses: [
        'Что вас так злит?',
        'Расскажите, что вызвало эту злость.'
      ]
    },
    
    // ========== ПРИОРИТЕТ 2 - Позитивные эмоции ==========
    { 
      priority: 2,
      regex: /(.*)?(счастлив|счастлива|радость|хорошо|отлично|прекрасно)(.+)?/i,
      responses: [
        'Замечательно! Что делает вас таким счастливым?',
        'Как приятно это слышать! Расскажите больше.'
      ]
    },
    
    // ========== ПРИОРИТЕТ 2 - Вопросы ==========
    { 
      priority: 2,
      regex: /(.+)\?$/,
      responses: [
        'А как вы сами ответили бы на этот вопрос?',
        'Почему вы спрашиваете?',
        'Что вы думаете по этому поводу?',
        'Интересный вопрос. А вы как считаете?'
      ]
    },
    
    // ========== ПРИОРИТЕТ 2 - Абсолюты ==========
    { 
      priority: 2,
      regex: /(.*)?(всегда|никогда|все|никто|ничего)(.+)/i,
      responses: [
        'Действительно всегда?',
        'Вы уверены, что никогда?',
        'Можете вспомнить хоть один случай-исключение?',
        'Абсолютно все? Это важное обобщение.'
      ]
    },
    
    // ========== ПРИОРИТЕТ 1 - Неопределённость ==========
    { 
      priority: 1,
      regex: /(не знаю|незнаю|понятия не имею|без понятия)/i,
      responses: [
        'Давайте попробуем разобраться вместе.',
        'Что вы чувствуете по этому поводу?',
        'Попробуйте угадать, даже если не уверены.'
      ]
    },
    {
      priority: 1,
      regex: /(может|возможно|наверное|вероятно)/i,
      responses: [
        'Вы не уверены?',
        'Что вызывает эту неопределённость?'
      ]
    },
    
    // ========== ПРИОРИТЕТ 1 - Согласие/Несогласие ==========
    {
      priority: 1,
      regex: /^(да|нет|конечно|разумеется|ага|угу)$/i,
      responses: [
        'Расскажите об этом подробнее.',
        'Продолжайте, пожалуйста.',
        'Я вас слушаю.'
      ]
    },
    
    // ========== ПРИОРИТЕТ 1 - Извинения ==========
    {
      priority: 1,
      regex: /(извини|прости|сожалею)/i,
      responses: [
        'Не нужно извиняться.',
        'Пожалуйста, продолжайте.',
        'За что вы извиняетесь?'
      ]
    },
    
    // ========== ПРИОРИТЕТ 0 - Благодарность ==========
    {
      priority: 0,
      regex: /(спасибо|благодарю|благодарен)/i,
      responses: [
        'Пожалуйста. Рад помочь.',
        'Не за что. Продолжайте, если хотите.'
      ]
    }
  ];

  // Сортируем паттерны по priority (от большего к меньшему)
  const sortedPatterns = patterns.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  // Обработка паттернов с учётом весов
  for (const pattern of sortedPatterns) {
    const match = input.match(pattern.regex);
    if (match) {
      let response;
      
      // Сохранить в память, если указан флаг
      if (pattern.saveToMemory) {
        session.elizaMemory.push({
          text: message,
          pattern: pattern,
          timestamp: Date.now()
        });
        // Ограничить память до 10 последних фраз
        if (session.elizaMemory.length > 10) {
          session.elizaMemory.shift();
        }
      }
      
      // Если есть шаблон для трансформации
      if (pattern.template) {
        response = pattern.template;
        for (let i = 1; i < match.length; i++) {
          const transformed = pattern.transform ? transformPronouns(match[i]) : match[i];
          response = response.replace(`$${i}`, transformed);
        }
      }
      // Иначе случайный ответ из списка
      else if (pattern.responses) {
        response = pattern.responses[Math.floor(Math.random() * pattern.responses.length)];
        // Заменить плейсхолдеры в responses (если есть)
        for (let i = 1; i < match.length; i++) {
          const transformed = pattern.transform ? transformPronouns(match[i]) : match[i];
          response = response.replace(`$${i}`, transformed);
        }
      }
      
      if (response) {
        return { output: `\nDOCTOR> ${response}\n\n` };
      }
    }
  }

  // Если нет совпадений - вернуть фразу из памяти
  if (session.elizaMemory.length > 0) {
    // 30% шанс вернуться к запомненной теме
    if (Math.random() < 0.3) {
      const memoryItem = session.elizaMemory[Math.floor(Math.random() * session.elizaMemory.length)];
      const memoryResponses = [
        'Давайте вернёмся к тому, что вы говорили ранее. Расскажите ещё об этом.',
        'Ранее вы упоминали что-то важное. Можете рассказать подробнее?',
        'Я думаю о том, что вы сказали раньше. Хотите обсудить это глубже?'
      ];
      const response = memoryResponses[Math.floor(Math.random() * memoryResponses.length)];
      return { output: `\nDOCTOR> ${response}\n\n` };
    }
  }

  // Ответы по умолчанию (если нет совпадений и не вернулись к памяти)
  const defaultResponses = [
    'Расскажите мне больше об этом.',
    'Это очень интересно. Продолжайте.',
    'Как вы себя чувствуете по этому поводу?',
    'Почему вы так думаете?',
    'Что это значит для вас?',
    'Можете объяснить подробнее?',
    'Давайте обсудим это глубже.',
    'Я вас внимательно слушаю.',
    'Продолжайте, пожалуйста.',
    'Это важно для вас?'
  ];

  const response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  return { output: `\nDOCTOR> ${response}\n\n` };
}

module.exports = doctorCommand;

