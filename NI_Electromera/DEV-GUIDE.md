# Руководство разработчика

## Архитектура проекта

### CSS

- `settings/` — переменные, normalize
- `base/` — базовые стили тегов
- `layout/` — шапка, сетка
- `components/` — используемые компоненты

### JS

#### Структура

js/
├── main.js # Точка входа
├── Storage.js # Работа с localStorage
├── modules/
│ ├── Auth.js # Административный режим (с панелью)
│ └── AuthStandalone.js # Административный режим (без панели)
└── managers/
├── DocumentsManager.js # Управление документами
├── NewsManager.js # Управление новостями
├── CardsManager.js # Управление стандартами
├── TableManager.js # Управление таблицей СМК
├── BlanksManager.js # Управление бланками
├── SecurityManager.js # Управление безопасностью
├── GreetingsManager.js # Управление приветствием
└── Search.js # Поиск в архиве стандартов

#### Базовый паттерн менеджера

```js
import storage from '../Storage.js'

class SomeManager {
	constructor() {
		this.container = document.querySelector('.container')
		this.storageKey = 'some-key'
		this.state = { items: [] }
		this.init()
	}

	async init() {
		await this.loadData()
		this.render()
		this.bindEvents()
	}

	async loadData() {
		const items = await storage.load(this.storageKey)
		this.state.items = items || this.getDefaultData()
	}

	async saveData() {
		await storage.save(this.storageKey, this.state.items)
	}

	render() {
		/* отрисовка */
	}
	bindEvents() {
		/* обработка кликов */
	}
}
```

## Хранение данных

- Используется Storage.js — обёртка над localStorage

- Данные хранятся по ключам:
  - news — новости
  - documents — документы
  - legal-docs — нормативные акты
  - standards — стандарты
  - qms — таблица СМК

- Административный режим
  - Класс Auth управляет входом/выходом
  - Класс admin-mode на body включает/выключает стили админки
  - Все менеджеры подписываются на изменение класса через MutationObserver

- Добавление нового менеджера
  - Создайте класс в js/managers/
  - Реализуйте методы init, loadData, saveData, render, bindEvents
  - Добавьте инициализацию в main.js на нужную страницу

- Смена кода доступа
  - Код доступа находится в js/modules/Auth.js в переменной accessCode

- Переключение на сервер
  - В js/Storage.js замените localStorage на fetch-запросы
  - Или создайте StorageServer.js и измените импорт

# Хранение данных в localStorage

## Общая информация

Все данные сайта сохраняются в браузере через `localStorage`. Это означает, что данные не передаются на сервер и хранятся только на том компьютере, где работает администратор.

## Структура хранения

| Ключ           | Что хранит                                         | Где используется                                     |
| -------------- | -------------------------------------------------- | ---------------------------------------------------- |
| `admin-access` | Статус административного режима (`true` / `false`) | Все страницы                                         |
| `news`         | Новости                                            | Главная страница                                     |
| `documents`    | Список документов                                  | Главная страница (блок «Документы»)                  |
| `legal-docs`   | Список нормативных актов                           | Главная страница (блок «Локальные нормативные акты») |
| `standards`    | Карточки стандартов                                | Страница «Архив стандартов»                          |
| `qms`          | Таблица СМК                                        | Страница «Система менеджмента качества»              |
| `blanks`       | Бланки документов                                  | Страница «Бланки»                                    |
| `security`     | Данные страницы безопасности                       | Страница «Информационная безопасность»               |
| `greetings`    | Текст приветствия                                  | Главная страница                                     |

## Форматы данных

### 1. Административный режим (`admin-access`)

```json
"true" или "false"
```

### 2. Новости

```json
[
	[
		{
			"id": "659d0ac1-6578-4ec7-adbd-e73a849cf51e",
			"date": "08-05-2026",
			"text": "Новая новость"
		}
	]
]
```

### 3. Документы

```json
[
	{
		"id": "9a355e16-091c-4668-bba4-58c6e7544df8",
		"title": "title",
		"fileUrl": "#"
	}
]
[
	{
		"id":"aad38777-157f-4d18-a75f-5f698e32993e",
		"title":"Новый документ",
		"fileUrl":"#"
		}
]
```

### 4. Стандартизация

```json
[
	{
		"id": "a975472d-6711-49f2-a848-aa8f63746a6f",
		"designation": "",
		"name": "title",
		"note": "",
		"fileUrl": "#",
		"originalFileName": ""
	}
]
```

### 5. Таблица СМК

```json
[
	{
		"id": "56a6eb46-094d-4384-9666-e015337d0668",
		"designation": "",
		"name": "title",
		"fileUrl": "#",
		"originalFileName": ""
	}
]
```

### 6. Приветствие

```json
[
	{
		"text": "Текст приветствия с <a href=\"#\">ссылкой</a><br>Перенос строки"
	}
]
```

### 7. Информационная безопасность

```json
{
	"infoText": "Текст с <a href=\"#\">ссылкой</a>",
	"documents": [
		{
			"id": "uuid",
			"title": "Приказ №20",
			"fileUrl": "#",
			"originalFileName": ""
		}
	]
}
```

### 8. Бланки

```json
{
    "letters": [
        {
            "id": "uuid",
            "title": "Бланк письма с логотипом цветной",
            "designation": "Бланк письма",
            "fileUrl": "#",
            "originalFileName": ""
        }
    ],
    "orders": [...],
    "dispositions": [...],
    "serviceNotes": [...]
}
```

## Список всех менеджеров

| Менеджер           | Файл                           | Страница         | Функции                                                         |
| ------------------ | ------------------------------ | ---------------- | --------------------------------------------------------------- |
| `GreetingsManager` | `managers/GreetingsManager.js` | Главная          | Редактирование текста приветствия                               |
| `NewsManager`      | `managers/NewsManager.js`      | Главная          | CRUD новостей, ссылки                                           |
| `DocumentsManager` | `managers/DocumentsManager.js` | Главная          | CRUD документов и нормативных актов                             |
| `BlanksManager`    | `managers/BlanksManager.js`    | Бланки           | CRUD бланков (письма, приказы, распоряжения, служебные записки) |
| `CardsManager`     | `managers/CardsManager.js`     | Стандартизация   | CRUD карточек стандартов                                        |
| `TableManager`     | `managers/TableManager.js`     | СМК              | CRUD строк таблицы                                              |
| `SecurityManager`  | `managers/SecurityManager.js`  | Инфобезопасность | Редактирование текста, CRUD документов                          |
| `Search`           | `managers/Search.js`           | Стандартизация   | Поиск по карточкам                                              |

### Особенности отдельных менеджеров

#### BlanksManager

- Для раздела «Письма» есть дополнительное поле «Примечание»
- При добавлении через форму создаётся карточка с иконками редактирования/удаления
- Иконка удаления расположена после текста, редактирования — перед текстом

#### SecurityManager

- Основной текст редактируется через textarea (Ctrl+Enter для сохранения)
- Поддерживает ссылки в формате `[текст](ссылка)`
- Документы управляются отдельно

#### GreetingsManager

- Полная поддержка ссылок
- Сохранение через Ctrl+Enter
