/* global chrome */
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        const installId = crypto.randomUUID()
        chrome.storage.local.set({ installId })
    }
})
