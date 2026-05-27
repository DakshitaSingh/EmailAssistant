chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchAttachment") {
        fetch(request.url)
            .then(response => response.blob())
            .then(blob => {
                // Convert binary blob to Base64 so it can pass across the message port safely
                const reader = new FileReader();
                reader.onloadend = () => {
                    sendResponse({ success: true, base64Data: reader.result });
                };
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                console.error("Secure background fetch failed:", error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keeps the communication channel open for asynchronous responses
    }
});