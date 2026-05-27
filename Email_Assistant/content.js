console.log("Email Writer Extension - Content Script Loaded");

function createAIButton(attachmentCount = 0) {
   const button = document.createElement('div');
   button.className = 'T-I J-J5-Ji aoO v7 T-I-atl L3 ai-reply-button';
   button.style.marginRight = '8px';
   button.setAttribute('role','button');
   
   if (attachmentCount > 0) {
       button.innerHTML = `AI Reply (${attachmentCount} PDF Detected)`;
       button.style.backgroundColor = '#1a73e8'; // Shines bright blue if a file is loaded
       button.setAttribute('data-tooltip', `Generate reply using document context`);
   } else {
       button.innerHTML = 'AI Reply';
       button.setAttribute('data-tooltip', 'Generate AI Reply');
   }
   return button;
}

// Upgraded Scanner: Checks every possible Gmail attachment wrapper pattern
function detectEmailAttachments() {
    const detectedFiles = [];
    
    // Look for all attachment cards, download buttons, or preview chips
    const attachmentCards = document.querySelectorAll('.aZo, .hq, [role="listitem"], [data-mime-type="application/pdf"]');
    
    attachmentCards.forEach(card => {
        // Try finding any link that triggers a download or preview stream
        const downloadLinkEl = card.querySelector('a[href*="disp="], a[href*="view=att"], a[href*="attachmentId"]');
        const nameEl = card.querySelector('.aYy, .vW, .vI, [id*="attachment_name"]');
        
        if (downloadLinkEl && nameEl) {
            const fileName = nameEl.innerText.trim();
            const fileUrl = downloadLinkEl.href;
            
            // Only capture PDFs and prevent tracking duplicate elements
            if (fileName.toLowerCase().endsWith('.pdf') && !detectedFiles.some(f => f.url === fileUrl)) {
                detectedFiles.push({
                    name: fileName,
                    url: fileUrl
                });
            }
        }
    });

    return detectedFiles;
}

function getEmailContent() {
    const selectors = ['.h7', '.a3s.aiL', '.gmail_quote', '[role="presentation"]'];
    for (const selector of selectors) {
        const content = document.querySelector(selector);
        if (content) return content.innerText.trim();
    }
    return '';
}

function findComposeToolbar() {
    const selectors = ['.btC', '.aDh', '[role="toolbar"]', '.gU.Up'];
    for (const selector of selectors) {
        const toolbar = document.querySelector(selector);
        if (toolbar) return toolbar;
    }
    return null;
}

function injectButton() {
    const existingButton = document.querySelector('.ai-reply-button');
    if (existingButton) existingButton.remove();

    const toolbar = findComposeToolbar();
    if (!toolbar) return;

    const attachments = detectEmailAttachments();
    console.log(`[SCANNER LOG] Found ${attachments.length} valid PDF files.`, attachments);

    const button = createAIButton(attachments.length);

    button.addEventListener('click', async () => {
        try {
            button.innerHTML = 'Reading Docs...';
            button.style.pointerEvents = 'none';

            const emailContent = getEmailContent();
            const formData = new FormData();
            formData.append('emailContent', emailContent);
            formData.append('tone', 'professional');

            if (attachments.length > 0) {
                const fileTarget = attachments[0];
                button.innerHTML = 'Fetching PDF...';

                // Pass the secure request block over to background.js
                const secureFileTransfer = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: "fetchAttachment", url: fileTarget.url }, resolve);
                });

                if (secureFileTransfer && secureFileTransfer.success) {
                    const responseData = await fetch(secureFileTransfer.base64Data);
                    const fileBlob = await responseData.blob();
                    const fileObject = new File([fileBlob], fileTarget.name, { type: "application/pdf" });
                    
                    formData.append('attachment', fileObject);
                    console.log(`[SUCCESS] "${fileTarget.name}" packed into submission binary packet.`);
                } else {
                    console.warn("Could not download attachment stream, processing prompt as normal text.");
                }
            }

            button.innerHTML = 'Generating...';
            
           const response = await fetch('https://email-extension-backend.onrender.com/api/email/generate', {
    method: 'POST',
    body: formData
});

            if (!response.ok) throw new Error('API Execution Failed');

            const generatedReply = await response.text();
            const composeBox = document.querySelector('[role="textbox"][g_editable="true"]');

            if (composeBox) {
                composeBox.focus();
                document.execCommand('insertText', false, generatedReply);
                
                // --- PROOF INDICATOR: Alert the user that context was successfully read ---
                if (attachments.length > 0) {
                    console.log("Context written matching attachment: " + attachments[0].name);
                }
            }
        } catch (error) {
            console.error(error);
            alert('Generation pipeline error occurred.');
        } finally {
            const freshAttachments = detectEmailAttachments();
            button.innerHTML = freshAttachments.length > 0 ? `AI Reply (${freshAttachments.length} PDF Detected)` : 'AI Reply';
            button.style.pointerEvents = 'auto';
        }
    });

    toolbar.insertBefore(button, toolbar.firstChild);
}

// Increased polling checks to let heavy threads load completely
const observer = new MutationObserver((mutations) => {
    for(const mutation of mutations) {
        const addedNodes = Array.from(mutation.addedNodes);
        const hasComposeElements = addedNodes.some(node =>
            node.nodeType === Node.ELEMENT_NODE && 
            (node.matches('.aDh, .btC, [role="dialog"]') || node.querySelector('.aDh, .btC, [role="dialog"]'))
        );

        if (hasComposeElements) {
            // Checked sequentially at 300ms and 1000ms to catch lazy-loaded attachment wrappers
            setTimeout(injectButton, 300);
            setTimeout(injectButton, 1000);
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});