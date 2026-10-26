import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],base:'./',define:{__DEV__:'false'},build:{outDir:'offline',target:'es2022',cssCodeSplit:false,rollupOptions:{output:{format:'iife',inlineDynamicImports:true,entryFileNames:'editor.js'}}}});
