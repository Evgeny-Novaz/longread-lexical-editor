# Проверка происхождения функций редактора

Проверено 23 октября 2026 года. Объект проверки — текущие исходники отдельного редактора на Lexical 0.52.0, включая верхнюю панель, всплывающую панель, блоки, комментарии и боковые кнопки.

## Результат

Редактирование содержимого статьи выполняется через Lexical. Самостоятельно разработанных алгоритмов форматирования, таблиц, вставки изображений, формул или перемещения блоков не найдено. Есть прикладной код вне Lexical; он перечислен ниже. Поэтому всю страницу целиком нельзя описывать как готовый компонент библиотеки без собственного кода.

## Происхождение функций

| Функция | Реализация |
| --- | --- |
| Ввод и выделение текста | LexicalExtensionComposer, RichTextExtension, LexicalContentEditable |
| Отмена и повтор | HistoryExtension, UNDO_COMMAND, REDO_COMMAND |
| Абзацы, заголовки, цитаты | @lexical/rich-text; готовые formatParagraph, formatHeading, formatQuote из Playground |
| Начертания, индексы и строчный код | FORMAT_TEXT_COMMAND |
| Выравнивание и отступы | FORMAT_ELEMENT_COMMAND, INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND |
| Списки | @lexical/list; готовые функции форматирования списков из Playground |
| Цвет текста и фона | $patchStyleText из @lexical/selection и палитра Playground |
| Ссылки | @lexical/link, TOGGLE_LINK_COMMAND, FloatingLinkEditorPlugin |
| Блок кода и подсветка | @lexical/code, CodeHighlightExtension; готовый formatCode из Playground |
| Очистка форматирования | Готовый clearFormatting из Playground, без изменения его алгоритма |
| Разделитель | HorizontalRuleExtension, INSERT_HORIZONTAL_RULE_COMMAND |
| Таблицы | @lexical/table; TablePlugin и инструменты таблиц из Playground |
| Изображения, изменение размера и подписи | ImagesExtension, ImageNode, ImageComponent, ImageResizer из Playground |
| Вставка изображений из буфера и перетаскиванием | DragDropPasteExtension и ImagesExtension из Playground |
| Формулы | EquationNode, EquationsExtension и редактор формул из Playground; для отображения используется KaTeX, как в официальном примере |
| Колонки | LayoutExtension, LayoutContainerNode, LayoutItemNode из Playground |
| Аккордеоны | CollapsibleExtension и связанные узлы из Playground |
| YouTube | AutoEmbedPlugin, YouTubeExtension и YouTubeNode из Playground |
| Комментарии и ответы | @lexical/mark, CommentPlugin и CommentStore из Playground |
| Перемещение блоков | DraggableBlockPlugin_EXPERIMENTAL из @lexical/react и оболочка из Playground |
| Меню добавления и команда / | ComponentPickerPlugin и меню боковой кнопки из Playground |
| Предпросмотр | Собственная кнопка вызывает editor.setEditable(false); состояние содержимого остаётся в Lexical |

## Отличие пакетов Lexical от официального Playground

Изображения, формулы, колонки, аккордеоны, YouTube и интерфейс комментариев — готовые примеры из официального репозитория Lexical Playground. Это не отдельные готовые компоненты npm-пакета lexical. В данной версии эти реализации скопированы из официального примера, а не разработаны заново.

База сравнения: facebook/lexical, commit 4f385cd03afae05fc72d114e3ebea0c7fcfa1040, каталог packages/lexical-playground/src.

При сравнении обнаружено 313 файлов, полностью совпадающих с исходным Playground. Алгоритмы ImageNode, ImagesExtension, ImageResizer, формул, колонок и аккордеонов сохранены; изменения в этих частях относятся к переводам интерфейса. CommentStore и функции форматирования ToolbarPlugin/utils.ts совпадают с оригиналом. Панель переставлена, меню ограничены нужными пунктами, заменены SVG и CSS.

## Код, написанный отдельно от библиотеки

1. **Внешний интерфейс:** шапка, хлебные крошки, компоновка панели, выбор исходных SVG, отступы и область наведения боковых кнопок.
2. **Название статьи:** сейчас это обычный React input в DocumentMeta. Поле названия не обслуживается Lexical и не входит в его историю отмены.
3. **Хранение черновика:** IndexedDB сохраняет JSON, полученный через editor.getEditorState().toJSON(). Восстановление выполняется через editor.parseEditorState() и editor.setEditorState(). Само хранилище и задержка автосохранения — прикладной код.
4. **Хранение названия и комментариев:** localStorage. Логика обсуждений остаётся из Playground; локальное сохранение добавлено отдельно.
5. **Переключатель предпросмотра и окно «Возможности»:** прикладные элементы интерфейса. Предпросмотр использует API Lexical, а не отдельный механизм редактирования.

Эти пункты не следует выдавать за готовые функции Lexical. В частности, утверждение «весь функционал приложения полностью из библиотеки» сейчас неверно из-за обычного поля названия и перечисленной обвязки.

## Дополнительная проверка

В обработчиках верхней панели нет форматирования через document.execCommand или ручной замены HTML редактора. В исходном Playground встречаются операции с DOM при экспорте и отображении; они не являются добавленным самостоятельно механизмом редактирования. Единственное найденное обращение к document.execCommand относится к копированию в отключённом отладочном TestRecorderPlugin, а не к форматированию текста.

Исходный чат «Первая версия редактора текста» и его файлы в ходе этой проверки не изменялись. Код редактора также не менялся: это отчёт о проверке, а не изменение функциональности.
