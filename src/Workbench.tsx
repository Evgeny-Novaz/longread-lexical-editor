import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {CLEAR_HISTORY_COMMAND} from 'lexical';
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

let database: Promise<IDBDatabase> | undefined;
function db() {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('cu-lexical-workbench-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('document');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function readDraft(): Promise<string | undefined> {
  const connection = await db();
  return new Promise((resolve, reject) => {
    const request = connection.transaction('document').objectStore('document').get('draft');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function writeDraft(state: string) {
  const connection = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = connection.transaction('document', 'readwrite');
    tx.objectStore('document').put(state, 'draft');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export function DocumentHeader() {
  return <header className="cu-header">
    <img className="cu-brand" src="./brand/b16ae.svg" alt="Центральный университет" />
    <span className="cu-header-section">Хендбук</span>
    <div className="cu-actions" id="workbench-actions" />
    <img className="cu-avatar" src="./brand/6b056.png" alt="editor.cu" />
  </header>;
}
export function DocumentMeta() {
  const [editor] = useLexicalComposerContext();
  const [editable,setEditable] = useState(editor.isEditable());
  const [title,setTitle] = useState(() => {
    try { return localStorage.getItem('cu-lexical-title-v1') ?? 'Как написать понятную статью'; }
    catch { return 'Как написать понятную статью'; }
  });
  useEffect(() => editor.registerEditableListener(setEditable), [editor]);
  return <div className="cu-document-meta">
    <div className="cu-breadcrumb">Хендбук <span>/</span> Работа с текстом <span>/</span> Статья</div>
    <div className="cu-document-label"><span className="cu-dot" /> Черновик <span className="cu-label-separator">·</span> Личный документ</div>
    <input className="cu-title" aria-label="Название статьи" placeholder="Новая страница…" value={title} readOnly={!editable} onChange={event => {
      setTitle(event.target.value);
      try { localStorage.setItem('cu-lexical-title-v1', event.target.value); }
      catch { window.dispatchEvent(new Event('cu-comment-save-error')); }
    }} />
  </div>;
}
export function WorkbenchPlugin() {
  const [editor] = useLexicalComposerContext();
  const [status,setStatus] = useState('Загрузка черновика…');
  const [preview,setPreview] = useState(false);
  const [help,setHelp] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const target = document.getElementById('workbench-actions');
  useEffect(() => {
    let alive = true, ready = false, timer: ReturnType<typeof setTimeout>;
    let writable = true;
    const save = () => {
      if (!ready || !writable) return;
      const state = JSON.stringify(editor.getEditorState().toJSON());
      writeDraft(state).then(() => {if(alive)setStatus('Сохранено в браузере');})
        .catch(() => {if(alive)setStatus('Не удалось сохранить черновик');});
    };
    // Editing is paused until restore finishes, so typing cannot be replaced by a late read.
    editor.setEditable(false);
    readDraft().then(saved => {
      if(!alive)return;
      if(saved) {
        try {editor.setEditorState(editor.parseEditorState(saved));editor.dispatchCommand(CLEAR_HISTORY_COMMAND);}
        catch {writable=false;setStatus('Сохранённый черновик не удалось открыть');}
      }
      ready=true;editor.setEditable(true);
      if(writable)setStatus('Сохранено в браузере');
    }).catch(() => {
      if(!alive)return;
      ready=true;editor.setEditable(true);setStatus('Хранилище браузера недоступно');
    });
    const unregister = editor.registerUpdateListener(({dirtyElements,dirtyLeaves}) => {
      if(!ready || !writable || (dirtyElements.size === 0 && dirtyLeaves.size === 0))return;
      setStatus('Сохранение…');clearTimeout(timer);timer=setTimeout(save,400);
    });
    const onHidden = () => {if(document.hidden){clearTimeout(timer);save();}};
    const onError = () => setStatus('Не удалось сохранить данные в браузере');
    const onKey = (e: KeyboardEvent) => {
      if(e.key==='Escape' && !dialog.current?.open){editor.setEditable(true);setPreview(false);document.body.classList.remove('cu-preview');}
    };
    document.addEventListener('visibilitychange',onHidden);
    window.addEventListener('cu-comment-save-error',onError);
    window.addEventListener('keydown',onKey);
    return () => {alive=false;clearTimeout(timer);unregister();document.removeEventListener('visibilitychange',onHidden);window.removeEventListener('cu-comment-save-error',onError);window.removeEventListener('keydown',onKey);};
  },[editor]);
  useEffect(() => {
    if(help)dialog.current?.showModal();else dialog.current?.close();
  },[help]);
  return <>
    {target && createPortal(<>
      <span className="cu-save" role="status"><span className="cu-save-icon">✓</span>{status}</span>
      <button className="cu-button cu-quiet" onClick={() => setHelp(true)}>Возможности</button>
      <button className="cu-button" onClick={() => {
        const next=!preview;setPreview(next);editor.setEditable(!next);document.body.classList.toggle('cu-preview',next);
      }}>{preview?'Вернуться к редактированию':'Предпросмотр'}</button>
    </>,target)}
    <div className="cu-footer"><span>Редактор текста</span><span>Lexical 0.52.0 <span className="cu-label-separator">·</span> Выделите текст для форматирования <span className="cu-label-separator">·</span> / — добавить блок</span></div>
    <dialog className="cu-dialog" ref={dialog} onCancel={() => setHelp(false)} onClick={e => {if(e.target===dialog.current)setHelp(false);}}>
      <div className="cu-dialog-heading"><div><div className="cu-eyebrow">ВОЗМОЖНОСТИ РЕДАКТОРА</div><h2>Что перенесено в Lexical</h2></div><button className="cu-close" aria-label="Закрыть" onClick={() => setHelp(false)}>×</button></div>
      <p>Отдельная версия по результату чата «Первая версия редактора текста». Используются официальные узлы и плагины Lexical Playground.</p>
      <h3>Доступно</h3>
      <ul><li>Абзацы, заголовки, списки, цитаты и блоки кода.</li><li>Жирный, курсив, подчёркивание, зачёркивание, индексы и строчный код; ссылки, цвет текста и фона, выравнивание и сброс оформления.</li><li>Изображения из файла, буфера и перетаскиванием; изменение размера и подпись.</li><li>Таблицы, 2–4 колонки, аккордеоны, разделители, строчные и отдельные формулы KaTeX, видео YouTube.</li><li>Комментарии к выделению, ответы и удаление; перемещение блоков, отмена и повтор.</li></ul>
      <h3>Не перенесено: нет готового аналога в Playground</h3>
      <ul><li>Инфоблок с выбором фона и эмодзи.</li><li>Синхронизируемые блоки между статьями и список мест использования.</li><li>Именованные якоря: создание, переименование и обновление ссылок.</li><li>Файловые и аудиовложения, загрузка своего видео или произвольный видеоплеер.</li><li>Редактирование отправленных комментариев и отмена их удаления.</li><li>Режим LaTeX «Текст с формулами» с разбором всего блока.</li><li>Автоматическое удаление пустой колонки с перестройкой остальных; выравнивание изображения вместе с подписью отдельными кнопками и скрытие подписи по Backspace.</li></ul>
      <p className="cu-note">Дерево хендбука, права доступа, публикация и история снимков статей — функции приложения вокруг редактора. В эту версию редактора они не включены. Черновик и комментарии сохраняются локально в этом браузере.</p>
      <a href="./comparison.html" target="_blank" rel="noreferrer">Полная таблица переноса функций ↗</a>
    </dialog>
  </>;
}
