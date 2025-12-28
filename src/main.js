// 檔案路徑: src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router' // 確保有這行

const app = createApp(App)

app.use(createPinia())
app.use(router) // 確保有這行

app.mount('#app')
