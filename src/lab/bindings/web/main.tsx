import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { memoryCache } from 'wenay-react2'
import { LabApp } from './lab-app'

void memoryCache.load()
const offDirty = memoryCache.onDirty(function saveLayout() {
    void memoryCache.saveDebounced(700)
})
window.addEventListener('visibilitychange', function flushOnHidden() {
    if (document.visibilityState == 'hidden') void memoryCache.flush()
})
window.addEventListener('pagehide', function flushOnPageHide() {
    void memoryCache.flush()
})
window.addEventListener('beforeunload', function removeMemoryListener() { offDirty() }, {once: true})

createRoot(document.getElementById('root')!).render(
    <StrictMode><LabApp/></StrictMode>,
)
