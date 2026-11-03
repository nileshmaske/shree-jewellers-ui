import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
 plugins:[react()],
 server:{
  port:5173,
  proxy:{
   '/api/auth':{target:'http://localhost:8081',changeOrigin:true},
   '/api/inventory':{target:'http://localhost:8082',changeOrigin:true},
   '/api/billing':{target:'http://localhost:8083',changeOrigin:true}
  }
 }
});
