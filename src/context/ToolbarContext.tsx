/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementFormatType} from 'lexical';

import React, {
  createContext,
  type JSX,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export const MIN_ALLOWED_FONT_SIZE = 8;
export const MAX_ALLOWED_FONT_SIZE = 72;
export const DEFAULT_FONT_SIZE = 16;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const rootTypeToRootName = {
  root: 'Root',
  table: 'Таблица',
};

export const blockTypeToBlockName = {
  bullet: 'Bulleted List',
  check: 'Список с отметками',
  code: 'Блок кода',
  h1: 'Заголовок 1',
  h2: 'Заголовок',
  h3: 'Подзаголовок',
  h4: 'Заголовок 4',
  h5: 'Заголовок 5',
  h6: 'Заголовок 6',
  number: 'Нумерованный список',
  paragraph: 'Обычный',
  quote: 'Цитата',
};

//disable eslint sorting rule for quick reference to toolbar state
/* eslint-disable sort-keys-fix/sort-keys-fix */
const INITIAL_TOOLBAR_STATE = {
  bgColor: '#fff',
  blockType: 'paragraph' as keyof typeof blockTypeToBlockName,
  canRedo: false,
  canUndo: false,
  codeLanguage: '',
  codeTheme: '',
  elementFormat: 'left' as ElementFormatType,
  fontColor: '#000',
  fontFamily: 'Arial',
  // Current font size in px
  fontSize: `${DEFAULT_FONT_SIZE}px`,
  // Font size input value - for controlled input
  fontSizeInputValue: `${DEFAULT_FONT_SIZE}`,
  isBold: false,
  isCode: false,
  isHighlight: false,
  isImageCaption: false,
  isItalic: false,
  isLink: false,
  isRTL: false,
  isStrikethrough: false,
  isSubscript: false,
  isSuperscript: false,
  isUnderline: false,
  isLowercase: false,
  isUppercase: false,
  isCapitalize: false,
  rootType: 'root' as keyof typeof rootTypeToRootName,
  listStartNumber: null as number | null,
};

type ToolbarState = typeof INITIAL_TOOLBAR_STATE;

// Utility type to get keys and infer value types
type ToolbarStateKey = keyof ToolbarState;
type ToolbarStateValue<Key extends ToolbarStateKey> = ToolbarState[Key];

type ContextShape = {
  toolbarState: ToolbarState;
  updateToolbarState<Key extends ToolbarStateKey>(
    key: Key,
    value: ToolbarStateValue<Key>,
  ): void;
};

const Context = createContext<ContextShape | undefined>(undefined);

export const ToolbarContext = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [toolbarState, setToolbarState] = useState(INITIAL_TOOLBAR_STATE);
  const selectionFontSize = toolbarState.fontSize;

  const updateToolbarState = useCallback(
    <Key extends ToolbarStateKey>(key: Key, value: ToolbarStateValue<Key>) => {
      setToolbarState(prev => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateToolbarState('fontSizeInputValue', selectionFontSize.slice(0, -2));
  }, [selectionFontSize, updateToolbarState]);

  const contextValue = useMemo(() => {
    return {
      toolbarState,
      updateToolbarState,
    };
  }, [toolbarState, updateToolbarState]);

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export const useToolbarState = () => {
  const context = useContext(Context);

  if (context === undefined) {
    throw new Error('useToolbarState must be used within a ToolbarProvider');
  }

  return context;
};
