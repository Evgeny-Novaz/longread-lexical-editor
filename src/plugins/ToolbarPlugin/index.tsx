/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useMergeRefs} from '@floating-ui/react';
import {$isCodeNode} from '@lexical/code';
import {
  getCodeLanguageOptions as getCodeLanguageOptionsPrism,
  normalizeCodeLanguage as normalizeCodeLanguagePrism,
} from '@lexical/code-prism';
import {
  getCodeLanguageOptions as getCodeLanguageOptionsShiki,
  getCodeThemeOptions as getCodeThemeOptionsShiki,
  normalizeCodeLanguage as normalizeCodeLanguageShiki,
} from '@lexical/code-shiki';
import {INSERT_HORIZONTAL_RULE_COMMAND} from '@lexical/extension';
import {$isLinkNode, TOGGLE_LINK_COMMAND} from '@lexical/link';
import {$isListNode, ListNode} from '@lexical/list';
import {ExtensionComponent} from '@lexical/react/ExtensionComponent';
import {INSERT_EMBED_COMMAND} from '@lexical/react/LexicalAutoEmbedPlugin';
import {useLexicalFocusManagerRef} from '@lexical/react/useLexicalFocusManagerRef';
import {useLexicalRovingTabIndexRef} from '@lexical/react/useLexicalRovingTabIndexRef';
import {$isHeadingNode} from '@lexical/rich-text';
import {
  $getSelectionStyleValueForProperty,
  $isParentElementRTL,
  $patchStyleText,
} from '@lexical/selection';
import {$isTableNode, $isTableSelection} from '@lexical/table';
import {$getNearestNodeOfType, $isEditorIsNestedEditor} from '@lexical/utils';
import {
  $addUpdateTag,
  $findMatchingParent,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $onUpdate,
  type AnyLexicalCommand,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  type CommandPayloadType,
  type ElementFormatType,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  HISTORIC_TAG,
  INDENT_CONTENT_COMMAND,
  IS_APPLE,
  type LexicalEditor,
  type LexicalNode,
  mergeRegister,
  type NodeKey,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  SKIP_SELECTION_FOCUS_TAG,
  type TextFormatType,
  UNDO_COMMAND,
} from 'lexical';
import {type Dispatch, type JSX, useCallback, useEffect, useState} from 'react';

import {useSettings} from '../../context/SettingsContext';
import {
  blockTypeToBlockName,
  DEFAULT_FONT_SIZE,
  useToolbarState,
} from '../../context/ToolbarContext';
import useModal from '../../hooks/useModal';
import catTypingGif from '../../images/cat-typing.gif';
import {$createStickyNode} from '../../nodes/StickyNode';
import DropDown, {DropDownItem} from '../../ui/DropDown';
import DropdownColorPicker from '../../ui/DropdownColorPicker';
import {isKeyboardInput} from '../../utils/focusUtils';
import {getSelectedNode} from '../../utils/getSelectedNode';
import {sanitizeUrl} from '../../utils/url';
import {EmbedConfigs} from '../AutoEmbedPlugin';
import {INSERT_COLLAPSIBLE_COMMAND} from '../CollapsibleExtension';
import {INSERT_DATETIME_COMMAND} from '../DateTimeExtension';
import {InsertEquationDialog} from '../EquationsExtension';
import {INSERT_EXCALIDRAW_COMMAND} from '../ExcalidrawExtension';
import {
  INSERT_IMAGE_COMMAND,
  InsertImageDialog,
  type InsertImagePayload,
} from '../ImagesExtension';
import InsertLayoutDialog from '../LayoutExtension/InsertLayoutDialog';
import {INSERT_PAGE_BREAK} from '../PageBreakExtension';
import {PagesReactExtension} from '../PagesReactExtension';
import {InsertPollDialog} from '../PollExtension';
import {$isRubyNode, $toggleRuby} from '../RubyExtension/RubyNode';
import {shortcut} from '../ShortcutsExtension/shortcuts';
import {InsertTableDialog} from '../TablePlugin';
import FontSize, {parseFontSizeForToolbar} from './fontSize';
import {
  clearFormatting,
  formatBulletList,
  formatCheckList,
  formatCode,
  formatHeading,
  formatNumberedList,
  formatParagraph,
  formatQuote,
} from './utils';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const rootTypeToRootName = {
  root: 'Root',
  table: 'Таблица',
};

const CODE_LANGUAGE_OPTIONS_PRISM: [string, string][] =
  getCodeLanguageOptionsPrism().filter(option =>
    [
      'c',
      'clike',
      'cpp',
      'css',
      'go',
      'html',
      'java',
      'js',
      'javascript',
      'markdown',
      'objc',
      'objective-c',
      'plain',
      'powershell',
      'py',
      'python',
      'rust',
      'sql',
      'swift',
      'typescript',
      'xml',
    ].includes(option[0]),
  );

const CODE_LANGUAGE_OPTIONS_SHIKI: [string, string][] =
  getCodeLanguageOptionsShiki().filter(option =>
    [
      'c',
      'clike',
      'cpp',
      'css',
      'go',
      'html',
      'java',
      'js',
      'javascript',
      'markdown',
      'objc',
      'objective-c',
      'plain',
      'powershell',
      'py',
      'python',
      'rust',
      'sql',
      'typescript',
      'xml',
    ].includes(option[0]),
  );

const CODE_THEME_OPTIONS_SHIKI: [string, string][] =
  getCodeThemeOptionsShiki().filter(option =>
    [
      'catppuccin-latte',
      'everforest-light',
      'github-light',
      'gruvbox-light-medium',
      'kanagawa-lotus',
      'dark-plus',
      'light-plus',
      'material-theme-lighter',
      'min-light',
      'one-light',
      'rose-pine-dawn',
      'slack-ochin',
      'snazzy-light',
      'solarized-light',
      'vitesse-light',
    ].includes(option[0]),
  );

const FONT_FAMILY_OPTIONS: [string, string][] = [
  ['Arial', 'Arial'],
  ['Courier New', 'Courier New'],
  ['Georgia', 'Georgia'],
  ['Times New Roman', 'Times New Roman'],
  ['Trebuchet MS', 'Trebuchet MS'],
  ['Verdana', 'Verdana'],
];

const FONT_SIZE_OPTIONS: [string, string][] = [
  ['10px', '10px'],
  ['11px', '11px'],
  ['12px', '12px'],
  ['13px', '13px'],
  ['14px', '14px'],
  ['15px', '15px'],
  ['16px', '16px'],
  ['17px', '17px'],
  ['18px', '18px'],
  ['19px', '19px'],
  ['20px', '20px'],
];

const ELEMENT_FORMAT_OPTIONS: {
  [key in Exclude<ElementFormatType, ''>]: {
    icon: string;
    iconRTL: string;
    name: string;
  };
} = {
  center: {
    icon: 'center-align',
    iconRTL: 'center-align',
    name: 'По центру',
  },
  end: {
    icon: 'right-align',
    iconRTL: 'left-align',
    name: 'По концу',
  },
  justify: {
    icon: 'justify-align',
    iconRTL: 'justify-align',
    name: 'По ширине',
  },
  left: {
    icon: 'left-align',
    iconRTL: 'left-align',
    name: 'По левому краю',
  },
  right: {
    icon: 'right-align',
    iconRTL: 'right-align',
    name: 'По правому краю',
  },
  start: {
    icon: 'left-align',
    iconRTL: 'right-align',
    name: 'По началу',
  },
};

function dropDownActiveClass(active: boolean) {
  if (active) {
    return 'active dropdown-item-active';
  } else {
    return '';
  }
}

function BlockFormatDropDown({
  editor,
  blockType,
  rootType,
  disabled = false,
}: {
  blockType: keyof typeof blockTypeToBlockName;
  rootType: keyof typeof rootTypeToRootName;
  editor: LexicalEditor;
  disabled?: boolean;
}): JSX.Element {
  return (
    <DropDown
      disabled={disabled}
      buttonClassName="toolbar-item block-controls"
      buttonIconClassName={'icon block-type ' + blockType}
      buttonLabel={blockTypeToBlockName[blockType]}
      buttonAriaLabel="Стиль текста">
      <DropDownItem
        className={
          'item wide ' + dropDownActiveClass(blockType === 'paragraph')
        }
        onClick={() => formatParagraph(editor)}>
        <div className="icon-text-container">
          <i className="icon paragraph" />
          <span className="text">Обычный</span>
        </div>
        <span className="shortcut">{shortcut('NORMAL')}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'h1')}
        onClick={() => formatHeading(editor, blockType, 'h1')}>
        <div className="icon-text-container">
          <i className="icon h1" />
          <span className="text">Заголовок 1</span>
        </div>
        <span className="shortcut">{shortcut('HEADING1')}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'h2')}
        onClick={() => formatHeading(editor, blockType, 'h2')}>
        <div className="icon-text-container">
          <i className="icon h2" />
          <span className="text">Заголовок</span>
        </div>
        <span className="shortcut">{shortcut('HEADING2')}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'h3')}
        onClick={() => formatHeading(editor, blockType, 'h3')}>
        <div className="icon-text-container">
          <i className="icon h3" />
          <span className="text">Подзаголовок</span>
        </div>
        <span className="shortcut">{shortcut('HEADING3')}</span>
      </DropDownItem>
    </DropDown>
  );
}

function Divider(): JSX.Element {
  return <div className="divider" />;
}

function FontDropDown({
  editor,
  value,
  style,
  disabled = false,
}: {
  editor: LexicalEditor;
  value: string;
  style: string;
  disabled?: boolean;
}): JSX.Element {
  const handleClick = useCallback(
    (option: string) => {
      editor.update(() => {
        $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
        const selection = $getSelection();
        if (selection !== null) {
          $patchStyleText(selection, {
            [style]: option,
          });
        }
      });
    },
    [editor, style],
  );

  const buttonAriaLabel =
    style === 'font-family'
      ? 'Formatting options for font family'
      : 'Formatting options for font size';

  return (
    <DropDown
      disabled={disabled}
      buttonClassName={'toolbar-item ' + style}
      buttonLabel={value}
      buttonIconClassName={
        style === 'font-family' ? 'icon block-type font-family' : ''
      }
      buttonAriaLabel={buttonAriaLabel}>
      {(style === 'font-family' ? FONT_FAMILY_OPTIONS : FONT_SIZE_OPTIONS).map(
        ([option, text]) => (
          <DropDownItem
            className={`item ${dropDownActiveClass(value === option)} ${
              style === 'font-size' ? 'fontsize-item' : ''
            }`}
            onClick={() => handleClick(option)}
            key={option}>
            <span className="text">{text}</span>
          </DropDownItem>
        ),
      )}
    </DropDown>
  );
}

function ElementFormatDropdown({
  editor,
  value,
  isRTL,
  disabled = false,
}: {
  editor: LexicalEditor;
  value: ElementFormatType;
  isRTL: boolean;
  disabled: boolean;
}) {
  const formatOption = ELEMENT_FORMAT_OPTIONS[value || 'left'];

  return (
    <DropDown
      disabled={disabled}
      buttonLabel={formatOption.name}
      buttonIconClassName={`icon ${
        isRTL ? formatOption.iconRTL : formatOption.icon
      }`}
      buttonClassName="toolbar-item spaced alignment"
      buttonAriaLabel="Выравнивание">
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
        }}
        className="item wide">
        <div className="icon-text-container">
          <i className="icon left-align" />
          <span className="text">По левому краю</span>
        </div>
        <span className="shortcut">{shortcut('LEFT_ALIGN')}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
        }}
        className="item wide">
        <div className="icon-text-container">
          <i className="icon center-align" />
          <span className="text">По центру</span>
        </div>
        <span className="shortcut">{shortcut('CENTER_ALIGN')}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
        }}
        className="item wide">
        <div className="icon-text-container">
          <i className="icon right-align" />
          <span className="text">По правому краю</span>
        </div>
        <span className="shortcut">{shortcut('RIGHT_ALIGN')}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
        }}
        className="item wide">
        <div className="icon-text-container">
          <i className="icon justify-align" />
          <span className="text">По ширине</span>
        </div>
        <span className="shortcut">{shortcut('JUSTIFY_ALIGN')}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'start');
        }}
        className="item wide">
        <i
          className={`icon ${
            isRTL
              ? ELEMENT_FORMAT_OPTIONS.start.iconRTL
              : ELEMENT_FORMAT_OPTIONS.start.icon
          }`}
        />
        <span className="text">По началу</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'end');
        }}
        className="item wide">
        <i
          className={`icon ${
            isRTL
              ? ELEMENT_FORMAT_OPTIONS.end.iconRTL
              : ELEMENT_FORMAT_OPTIONS.end.icon
          }`}
        />
        <span className="text">По концу</span>
      </DropDownItem>
      <Divider />
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(OUTDENT_CONTENT_COMMAND);
        }}
        className="item wide">
        <div className="icon-text-container">
          <i className={'icon ' + (isRTL ? 'indent' : 'outdent')} />
          <span className="text">Уменьшить отступ</span>
        </div>
        <span className="shortcut">{shortcut('OUTDENT')}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(INDENT_CONTENT_COMMAND);
        }}
        className="item wide">
        <div className="icon-text-container">
          <i className={'icon ' + (isRTL ? 'outdent' : 'indent')} />
          <span className="text">Увеличить отступ</span>
        </div>
        <span className="shortcut">{shortcut('INDENT')}</span>
      </DropDownItem>
    </DropDown>
  );
}

function $findTopLevelElement(node: LexicalNode) {
  let topLevelElement =
    node.getKey() === 'root'
      ? node
      : $findMatchingParent(node, e => {
          const parent = e.getParent();
          return parent !== null && $isRootOrShadowRoot(parent);
        });

  if (topLevelElement === null) {
    topLevelElement = node.getTopLevelElementOrThrow();
  }
  return topLevelElement;
}

export default function ToolbarPlugin({
  editor,
  activeEditor,
  setActiveEditor,
  setIsLinkEditMode,
  setIsRubyEditMode,
}: {
  editor: LexicalEditor;
  activeEditor: LexicalEditor;
  setActiveEditor: Dispatch<LexicalEditor>;
  setIsLinkEditMode: Dispatch<boolean>;
  setIsRubyEditMode: Dispatch<boolean>;
}): JSX.Element {
  const [selectedElementKey, setSelectedElementKey] = useState<NodeKey | null>(
    null,
  );
  const [modal, showModal] = useModal();
  const [isEditable, setIsEditable] = useState(() => editor.isEditable());
  const {toolbarState, updateToolbarState} = useToolbarState();
  const rovingRef = useLexicalRovingTabIndexRef();
  const focusManagerRef = useLexicalFocusManagerRef();
  const toolbarRef = useMergeRefs([rovingRef, focusManagerRef]);

  const dispatchToolbarCommand = <T extends AnyLexicalCommand>(
    command: T,
    payload: CommandPayloadType<T> | undefined = undefined,
    skipRefocus: boolean = false,
  ) => {
    activeEditor.update(() => {
      if (skipRefocus) {
        $addUpdateTag(SKIP_DOM_SELECTION_TAG);
      }

      // Re-assert on Type so that payload can have a default param
      activeEditor.dispatchCommand(command, payload as CommandPayloadType<T>);
    });
  };

  const dispatchFormatTextCommand = (
    payload: TextFormatType,
    skipRefocus: boolean = false,
  ) => dispatchToolbarCommand(FORMAT_TEXT_COMMAND, payload, skipRefocus);

  const $handleHeadingNode = useCallback(
    (selectedElement: LexicalNode) => {
      const type = $isHeadingNode(selectedElement)
        ? selectedElement.getTag()
        : selectedElement.getType();

      if (type in blockTypeToBlockName) {
        updateToolbarState(
          'blockType',
          type as keyof typeof blockTypeToBlockName,
        );
      }
    },
    [updateToolbarState],
  );

  const {
    settings: {isCodeHighlighted, isCodeShiki},
  } = useSettings();

  const $handleCodeNode = useCallback(
    (element: LexicalNode) => {
      if ($isCodeNode(element)) {
        const language = element.getLanguage();
        updateToolbarState(
          'codeLanguage',
          language
            ? (isCodeHighlighted &&
                (isCodeShiki
                  ? normalizeCodeLanguageShiki(language)
                  : normalizeCodeLanguagePrism(language))) ||
                language
            : '',
        );
        const theme = element.getTheme();
        updateToolbarState('codeTheme', theme || '');
        return;
      }
    },
    [updateToolbarState, isCodeHighlighted, isCodeShiki],
  );

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      if (activeEditor !== editor && $isEditorIsNestedEditor(activeEditor)) {
        const rootElement = activeEditor.getRootElement();
        updateToolbarState(
          'isImageCaption',
          !!rootElement?.parentElement?.classList.contains(
            'image-caption-container',
          ),
        );
      } else {
        updateToolbarState('isImageCaption', false);
      }

      const anchorNode = selection.anchor.getNode();
      const element = $findTopLevelElement(anchorNode);
      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      updateToolbarState('isRTL', $isParentElementRTL(selection));

      // Update links
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      const isLink = $isLinkNode(parent) || $isLinkNode(node);
      updateToolbarState('isLink', isLink);

      const tableNode = $findMatchingParent(node, $isTableNode);
      if ($isTableNode(tableNode)) {
        updateToolbarState('rootType', 'table');
      } else {
        updateToolbarState('rootType', 'root');
      }

      if (elementDOM !== null) {
        setSelectedElementKey(elementKey);
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, ListNode);
          const type = parentList
            ? parentList.getListType()
            : element.getListType();

          updateToolbarState('blockType', type);
        } else {
          $handleHeadingNode(element);
          $handleCodeNode(element);
        }
      }

      // Handle buttons
      updateToolbarState(
        'fontColor',
        $getSelectionStyleValueForProperty(selection, 'color', '#000'),
      );
      updateToolbarState(
        'bgColor',
        $getSelectionStyleValueForProperty(
          selection,
          'background-color',
          '#fff',
        ),
      );
      updateToolbarState(
        'fontFamily',
        $getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'),
      );
      let matchingParent;
      if ($isLinkNode(parent)) {
        // If node is a link, we need to fetch the parent paragraph node to set format
        matchingParent = $findMatchingParent(
          node,
          parentNode => $isElementNode(parentNode) && !parentNode.isInline(),
        );
      }

      // If matchingParent is a valid node, pass it's format type
      updateToolbarState(
        'elementFormat',
        $isElementNode(matchingParent)
          ? matchingParent.getFormatType()
          : $isElementNode(node)
            ? node.getFormatType()
            : parent?.getFormatType() || 'left',
      );
    }
    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      // Update text format
      updateToolbarState('isBold', selection.hasFormat('bold'));
      updateToolbarState('isItalic', selection.hasFormat('italic'));
      updateToolbarState('isUnderline', selection.hasFormat('underline'));
      updateToolbarState(
        'isStrikethrough',
        selection.hasFormat('strikethrough'),
      );
      updateToolbarState('isSubscript', selection.hasFormat('subscript'));
      updateToolbarState('isSuperscript', selection.hasFormat('superscript'));
      updateToolbarState('isHighlight', selection.hasFormat('highlight'));
      updateToolbarState('isCode', selection.hasFormat('code'));
      updateToolbarState(
        'fontSize',
        $getSelectionStyleValueForProperty(
          selection,
          'font-size',
          `${DEFAULT_FONT_SIZE}px`,
        ),
      );
      updateToolbarState('isLowercase', selection.hasFormat('lowercase'));
      updateToolbarState('isUppercase', selection.hasFormat('uppercase'));
      updateToolbarState('isCapitalize', selection.hasFormat('capitalize'));
    }
    if ($isNodeSelection(selection)) {
      const nodes = selection.getNodes();
      for (const selectedNode of nodes) {
        const parentList = $getNearestNodeOfType(selectedNode, ListNode);
        if (parentList) {
          const type = parentList.getListType();
          updateToolbarState('blockType', type);
        } else {
          const selectedElement = $findTopLevelElement(selectedNode);
          $handleHeadingNode(selectedElement);
          $handleCodeNode(selectedElement);
          // Update elementFormat for node selection (e.g., images)
          if ($isElementNode(selectedElement)) {
            updateToolbarState(
              'elementFormat',
              selectedElement.getFormatType(),
            );
          }
        }
      }
    }
  }, [
    activeEditor,
    editor,
    updateToolbarState,
    $handleHeadingNode,
    $handleCodeNode,
  ]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor);
        $onUpdate(() => newEditor.read('latest', $updateToolbar));
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor, $updateToolbar, setActiveEditor]);

  useEffect(() => {
    activeEditor.read('latest', () => {
      $updateToolbar();
    });
  }, [activeEditor, $updateToolbar]);

  useEffect(() => {
    return mergeRegister(
      editor.registerEditableListener(editable => {
        setIsEditable(editable);
      }),
      activeEditor.registerUpdateListener(({editorState}) => {
        editorState.read(
          () => {
            $updateToolbar();
          },
          {editor: activeEditor},
        );
      }),
      activeEditor.registerCommand(
        CAN_UNDO_COMMAND,
        payload => {
          updateToolbarState('canUndo', payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      activeEditor.registerCommand(
        CAN_REDO_COMMAND,
        payload => {
          updateToolbarState('canRedo', payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [$updateToolbar, activeEditor, editor, updateToolbarState]);

  const applyStyleText = useCallback(
    (
      styles: Record<string, string>,
      skipHistoryStack?: boolean,
      skipRefocus: boolean = false,
    ) => {
      activeEditor.update(
        () => {
          if (skipRefocus) {
            $addUpdateTag(SKIP_DOM_SELECTION_TAG);
          }
          const selection = $getSelection();
          if (selection !== null) {
            $patchStyleText(selection, styles);
          }
        },
        skipHistoryStack ? {tag: HISTORIC_TAG} : {},
      );
    },
    [activeEditor],
  );

  const onFontColorSelect = useCallback(
    (value: string, skipHistoryStack: boolean, skipRefocus: boolean) => {
      applyStyleText({color: value}, skipHistoryStack, skipRefocus);
    },
    [applyStyleText],
  );

  const onBgColorSelect = useCallback(
    (value: string, skipHistoryStack: boolean, skipRefocus: boolean) => {
      applyStyleText(
        {'background-color': value},
        skipHistoryStack,
        skipRefocus,
      );
    },
    [applyStyleText],
  );

  const insertLink = useCallback(() => {
    if (!toolbarState.isLink) {
      setIsLinkEditMode(true);
      activeEditor.dispatchCommand(
        TOGGLE_LINK_COMMAND,
        sanitizeUrl('https://'),
      );
    } else {
      setIsLinkEditMode(false);
      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [activeEditor, setIsLinkEditMode, toolbarState.isLink]);

  const insertRuby = useCallback(() => {
    const {hasRuby, hasSelection} = activeEditor.read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        return {
          hasRuby: selection.getNodes().some($isRubyNode),
          hasSelection: !selection.isCollapsed(),
        };
      }
      return {hasRuby: false, hasSelection: false};
    });
    if (hasRuby) {
      activeEditor.update(() => {
        $toggleRuby(null);
      });
    } else if (hasSelection) {
      setIsRubyEditMode(true);
    }
  }, [activeEditor, setIsRubyEditMode]);

  const onCodeLanguageSelect = useCallback(
    (value: string | null) => {
      activeEditor.update(() => {
        $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
        if (selectedElementKey !== null) {
          const node = $getNodeByKey(selectedElementKey);
          if ($isCodeNode(node)) {
            node.setLanguage(value);
          }
        }
      });
    },
    [activeEditor, selectedElementKey],
  );
  const onCodeThemeSelect = useCallback(
    (value: string) => {
      activeEditor.update(() => {
        if (selectedElementKey !== null) {
          const node = $getNodeByKey(selectedElementKey);
          if ($isCodeNode(node)) {
            node.setTheme(value);
          }
        }
      });
    },
    [activeEditor, selectedElementKey],
  );
  const insertGifOnClick = (payload: InsertImagePayload) => {
    activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
  };

  const canViewerSeeInsertDropdown = !toolbarState.isImageCaption;
  const canViewerSeeInsertCodeButton = !toolbarState.isImageCaption;

  // Only toolbar composition changes here. All actions below use the existing
  // Lexical commands, Playground formatting utilities and insertion dialogs.
  return (
    <div ref={toolbarRef} className="toolbar cu-original-toolbar" role="toolbar" aria-label="Форматирование текста">
      <button disabled={!toolbarState.canUndo || !isEditable} onClick={e => dispatchToolbarCommand(UNDO_COMMAND, undefined, isKeyboardInput(e))} className="toolbar-item" title="Отменить" aria-label="Отменить"><i className="format undo" /></button>
      <button disabled={!toolbarState.canRedo || !isEditable} onClick={e => dispatchToolbarCommand(REDO_COMMAND, undefined, isKeyboardInput(e))} className="toolbar-item" title="Повторить" aria-label="Повторить"><i className="format redo" /></button>
      <Divider />
      <BlockFormatDropDown disabled={!isEditable} blockType={toolbarState.blockType} rootType={toolbarState.rootType} editor={activeEditor} />
      <Divider />
      <DropDown disabled={!isEditable} buttonClassName="toolbar-item" buttonAriaLabel="Начертание" buttonIconClassName="icon dropdown-more" hideChevron>
        {([
          ['bold', 'Жирный', toolbarState.isBold, 'bold'],
          ['italic', 'Курсив', toolbarState.isItalic, 'italic'],
          ['underline', 'Подчёркнутый', toolbarState.isUnderline, 'underline'],
          ['strikethrough', 'Зачёркнутый', toolbarState.isStrikethrough, 'strikethrough'],
          ['code', 'Строчный код', toolbarState.isCode, 'code'],
        ] as const).map(([format, label, active, icon]) => (
          <DropDownItem key={format} className={'item ' + dropDownActiveClass(active)} onClick={e => dispatchFormatTextCommand(format, isKeyboardInput(e))}>
            <i className={'icon ' + icon} /><span className="text">{label}</span>
          </DropDownItem>
        ))}
      </DropDown>
      <ElementFormatDropdown disabled={!isEditable} value={toolbarState.elementFormat} editor={activeEditor} isRTL={toolbarState.isRTL} />
      <DropDown disabled={!isEditable} buttonClassName="toolbar-item list-control" buttonAriaLabel="Список" buttonIconClassName="icon bullet-list" hideChevron>
        <DropDownItem className={'item ' + dropDownActiveClass(toolbarState.blockType === 'bullet')} onClick={() => formatBulletList(activeEditor, toolbarState.blockType)}><i className="icon bullet-list" /><span className="text">Маркированный список</span></DropDownItem>
        <DropDownItem className={'item ' + dropDownActiveClass(toolbarState.blockType === 'number')} onClick={() => formatNumberedList(activeEditor, toolbarState.blockType)}><i className="icon numbered-list" /><span className="text">Нумерованный список</span></DropDownItem>
        <DropDownItem className={'item ' + dropDownActiveClass(toolbarState.blockType === 'check')} onClick={() => formatCheckList(activeEditor, toolbarState.blockType)}><i className="icon check-list" /><span className="text">Список с отметками</span></DropDownItem>
      </DropDown>
      <button disabled={!isEditable} className={'toolbar-item ' + (toolbarState.blockType === 'quote' ? 'active' : '')} title="Цитата" aria-label="Цитата" onClick={() => formatQuote(activeEditor, toolbarState.blockType)}><i className="icon quote" /></button>
      <button disabled={!isEditable} className={'toolbar-item ' + (toolbarState.blockType === 'code' ? 'active' : '')} title="Блок кода" aria-label="Блок кода" onClick={() => formatCode(activeEditor, toolbarState.blockType)}><i className="icon code" /></button>
      <button disabled={!isEditable || !canViewerSeeInsertDropdown} className="toolbar-item" title="Формула LaTeX" aria-label="Формула LaTeX" onClick={() => showModal('Добавить формулу', onClose => <InsertEquationDialog activeEditor={activeEditor} onClose={onClose} />)}><i className="icon equation" /></button>
      <button disabled={!isEditable} className={'toolbar-item ' + (toolbarState.isLink ? 'active' : '')} title="Ссылка" aria-label="Ссылка" onClick={insertLink}><i className="icon link" /></button>
      <Divider />
      <button disabled={!isEditable} className={'toolbar-item ' + (toolbarState.isSubscript ? 'active' : '')} title="Нижний индекс" aria-label="Нижний индекс" onClick={e => dispatchFormatTextCommand('subscript', isKeyboardInput(e))}><i className="icon subscript" /></button>
      <button disabled={!isEditable} className={'toolbar-item ' + (toolbarState.isSuperscript ? 'active' : '')} title="Верхний индекс" aria-label="Верхний индекс" onClick={e => dispatchFormatTextCommand('superscript', isKeyboardInput(e))}><i className="icon superscript" /></button>
      <Divider />
      <DropdownColorPicker disabled={!isEditable} buttonClassName="toolbar-item color-picker" buttonAriaLabel="Цвет текста" buttonIconClassName="icon font-color" color={toolbarState.fontColor} onChange={onFontColorSelect} />
      <DropdownColorPicker disabled={!isEditable} buttonClassName="toolbar-item color-picker" buttonAriaLabel="Цвет фона текста" buttonIconClassName="icon bg-color" color={toolbarState.bgColor} onChange={onBgColorSelect} />
      <Divider />
      <button disabled={!isEditable || !canViewerSeeInsertDropdown} className="toolbar-item" title="Разделитель" aria-label="Разделитель" onClick={() => dispatchToolbarCommand(INSERT_HORIZONTAL_RULE_COMMAND)}><i className="icon horizontal-rule" /></button>
      <button disabled={!isEditable || !canViewerSeeInsertDropdown} className="toolbar-item" title="Таблица" aria-label="Таблица" onClick={() => showModal('Добавить таблицу', onClose => <InsertTableDialog activeEditor={activeEditor} onClose={onClose} />)}><i className="icon table" /></button>
      <button disabled={!isEditable || !canViewerSeeInsertDropdown} className="toolbar-item" title="Колонки" aria-label="Колонки" onClick={() => showModal('Добавить колонки', onClose => <InsertLayoutDialog activeEditor={activeEditor} onClose={onClose} />)}><i className="icon columns" /></button>
      <button disabled={!isEditable || !canViewerSeeInsertDropdown} className="toolbar-item" title="Аккордеон" aria-label="Аккордеон" onClick={() => dispatchToolbarCommand(INSERT_COLLAPSIBLE_COMMAND)}><i className="icon caret-right" /></button>
      <Divider />
      <button disabled={!isEditable} className="toolbar-item" title="Очистить форматирование" aria-label="Очистить форматирование" onClick={e => clearFormatting(activeEditor, isKeyboardInput(e))}><i className="icon clear" /></button>
      <Divider />
      <button disabled={!isEditable || !canViewerSeeInsertDropdown} className="toolbar-item" title="Изображение" aria-label="Изображение" onClick={() => showModal('Добавить изображение', onClose => <InsertImageDialog activeEditor={activeEditor} onClose={onClose} />)}><i className="icon image" /></button>
      <button disabled={!isEditable || !canViewerSeeInsertDropdown} className="toolbar-item" title="Видео YouTube" aria-label="Видео YouTube" onClick={() => dispatchToolbarCommand(INSERT_EMBED_COMMAND, 'youtube-video')}><i className="icon youtube" /></button>
      {modal}
    </div>
  );
}
