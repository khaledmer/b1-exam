import {defineConfig} from 'vite'; import react from '@vitejs/plugin-react'; import tailwind from '@tailwindcss/vite';
export default defineConfig({root:'client',plugins:[react(),tailwind()],
 server:{proxy:{'/api':'http://localhost:3001'}},build:{outDir:'../dist',emptyOutDir:true}});
