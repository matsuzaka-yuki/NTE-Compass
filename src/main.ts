import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import App from './App.vue'
import './assets/main.css'
import { initTheme } from './composables/useTheme'

// Apply persisted/system theme before mount to avoid a flash of the wrong theme.
initTheme()

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
