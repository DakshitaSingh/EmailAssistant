chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchAttachment") {
        fetch(request.url)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.blob();
            })
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    sendResponse({ success: true, base64Data: reader.result });
                };
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                console.error("Background fetch worker failed:", error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // ◄─── CRITICAL: Keeps communication port alive asynchronously
    }
});