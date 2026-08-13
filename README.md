# AI Dimension

![AI Dimension Interface](images/AI%20Dimension.png)

*( 🇬🇧 [English](#english) | 🇷🇺 [Русский](#русский) )*

<a id="english"></a>
## 🇬🇧 English

**AI Dimension** is a modern CEP panel (extension) for Adobe Illustrator designed to automatically draw technical dimensions, bounds, and leader lines for vector objects.

This script was created as a spiritual successor and complete rewrite of the popular old script *"AI measurment"*. The goal was to preserve the familiar workflow while ensuring compatibility with modern versions of Adobe Illustrator and adding several new features.

### Main New Features and Capabilities
* **Support for modern Illustrator versions** — the extension works as a native dockable panel.
* **Measurement units** — added support for choosing dimensions (mm, cm, in, pt, px). The script's math automatically adapts to your workflow, and the selected unit can be displayed next to the number (the `unit` option).
* **Color presets (CMYK)** — you can now set the color of the dimension lines and text. There are 6 slots for saving your custom colors (saved automatically).
* **Settings preservation** — the panel automatically remembers all your settings (line lengths, offsets, fonts, checkboxes). You won't have to configure the script again after restarting the program.
* **3 preset slots (min / med / max)** — allows quick switching between prepared dimension styles (e.g., for small details, medium, and very large drawings). You can overwrite them by checking the `save` box and clicking the desired preset.
* **Reset to factory defaults (default)** — you can revert all sliders, settings, and saved colors to their default values at any time.

### Features
* Dimensioning width (top / bottom) and height (left / right).
* Dimensioning the gap between two selected objects.
* Measuring the radius and diameter of circles.
* Marking the center of an object.
* Flexible appearance customization: line thickness (stroke), distance from the object (gap), leader line extension (indent), arrow size (arrow), font size, and rounding precision (up to 3 decimal places).
* Moving all dimensions to a specifically designated separate layer (`layer` option).
* Ability to place dimensions outside the active artboard (`out artboard` option).

### Installation

The plugin supports Adobe Illustrator CC 2014 – 2026+.

#### Step 1. Enable Debug Mode (PlayerDebugMode)
To run unsigned CEP plugins, you must enable debug mode in the Windows registry.
1. Run the `enable_player_debug_mode.reg` file by double-clicking it.
2. Confirm adding the changes to the registry by clicking "Yes" -> "OK".

#### Step 2. Copy the plugin files
Copy the `AI Dimension` folder (which contains the `CSXS`, `js`, `css` folders, `index.html` file, etc.) into the user profile directory:

`%APPDATA%\Adobe\CEP\extensions\`

For quick access:
1. Press `Win + R`
2. Paste the path: `%APPDATA%\Adobe\CEP\extensions`
3. Press Enter, and copy the `AI Dimension` folder into the opened window.

> [!WARNING]
> Install the plugin specifically in the `%APPDATA%` path. If installed globally (in Program Files), the automatic saving of settings and colors may not work due to lack of write permissions!

#### Step 3. Launch the plugin
1. Restart Adobe Illustrator.
2. In the top menu, open:
   `Window -> Extensions -> AI Dimension`
   *or in newer versions:*
   `Window -> Extensions (Legacy) -> AI Dimension`.

## 🛠️ Other Projects

**[ComfyUI Photoshop Plugin (PH-CU-S)](https://github.com/SaidAuita/ComfyUI_PH-CU-S)**
* A powerful Photoshop plugin powered by ComfyUI, providing direct integration with local generative models without any clouds, subscriptions, or recurring fees.

---

<a id="русский"></a>
## 🇷🇺 Русский

**AI Dimension** — это современная CEP-панель (расширение) для Adobe Illustrator, предназначенная для автоматического проставления технических размеров, габаритов и выносных линий к векторным объектам.

Скрипт создавался как идейное продолжение и полная переработка популярного старого скрипта *"AI measurment"*. Целью было сохранить привычную логику работы, но при этом обеспечить совместимость с современными версиями Adobe Illustrator и добавить ряд новых функций.

### Основные нововведения и возможности
* **Поддержка современных версий Illustrator** — расширение работает как нативная закрепляемая панель.
* **Единицы измерения** — добавлена поддержка выбора размерностей (mm, cm, in, pt, px). Математика скрипта автоматически адаптируется под ваш рабочий процесс, а выбранную единицу измерения можно выводить рядом с числом (опция `unit`).
* **Цветовые пресеты (CMYK)** — теперь вы можете задавать цвет выносных линий и текста. Есть 6 ячеек для сохранения собственных цветов (сохраняются автоматически).
* **Сохранение настроек** — панель автоматически запоминает все ваши настройки (длину линий, отступы, шрифты, галочки). Вам не придется заново настраивать скрипт после перезапуска программы.
* **3 слота для пресетов (min / med / max)** — позволяют быстро переключаться между заготовленными стилями размеров (например, для мелких деталей, средних и очень крупных чертежей). Вы можете переназначить их под себя, включив чекбокс `save` и нажав на нужный пресет.
* **Сброс до заводских настроек (default)** — в любой момент вы можете вернуть все ползунки, настройки и сохраненные цвета к значениям по умолчанию.

### Функционал
* Простановка ширины (сверху / снизу) и высоты (слева / справа).
* Простановка размеров между двумя выбранными объектами.
* Измерение радиуса и диаметра окружностей.
* Пометка центра объекта.
* Гибкая настройка внешнего вида: толщина линии (stroke), отступ от объекта (gap), вынос линии (indent), размер стрелки (arrow), размер шрифта и точность округления (до 3 знаков после запятой).
* Вынос всех размеров на специально заданный отдельный слой (опция `layer`).
* Возможность выносить размеры за пределы активного артборда (опция `out artboard`).

### Установка

Плагин поддерживает версии Adobe Illustrator CC 2014 – 2026+.

#### Шаг 1. Включение режима отладки (PlayerDebugMode)
Для запуска неподписанных CEP-плагинов требуется включить режим отладки в реестре Windows.
1. Запустите файл `enable_player_debug_mode.reg` двойным кликом мыши.
2. Подтвердите добавление изменений в реестр, нажав "Да" -> "ОК".

#### Шаг 2. Копирование файлов плагина
Скопируйте папку `AI Dimension` (в которой находятся папки `CSXS`, `js`, `css`, файл `index.html` и т.д.) в директорию профиля пользователя:

`%APPDATA%\Adobe\CEP\extensions\`

Для быстрого перехода:
1. Нажмите `Win + R`
2. Вставьте путь: `%APPDATA%\Adobe\CEP\extensions`
3. Нажмите Enter, и скопируйте папку `AI Dimension` в открывшееся окно.

> [!WARNING]
> Устанавливайте плагин именно по пути `%APPDATA%`. Если установить его глобально (в Program Files), функция автоматического сохранения настроек и цветов может не работать из-за отсутствия прав на запись!

#### Шаг 3. Запуск плагина
1. Перезапустите Adobe Illustrator.
2. В верхнем меню откройте:
   `Окно -> Расширения -> AI Dimension` (Window -> Extensions -> AI Dimension)
   *или в более новых версиях:*
   `Окно -> Расширения (устаревшие) -> AI Dimension` (Window -> Extensions (Legacy) -> AI Dimension).

## 🛠️ Мои проекты

**[ComfyUI Photoshop Plugin (PH-CU-S)](https://github.com/SaidAuita/ComfyUI_PH-CU-S)**
* Мощный плагин для Photoshop на базе ComfyUI, обеспечивающий прямую интеграцию с локальными генеративными моделями без облаков, подписок и регулярных платежей.
