/* global chrome */
const getInstallationId = async () => {
    let { installId } = await chrome.storage.local.get('installId')
    if (typeof installId !== 'string' || !installId) {
        installId = crypto.randomUUID()
        await chrome.storage.local.set({ installId })
    }
    return installId
}

export { getInstallationId }