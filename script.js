// DOM elements
const imageInput = document.getElementById('imageInput');
const scanBtn = document.getElementById('scanBtn');
const ocrText = document.getElementById('ocrText');
const result = document.getElementById('result');

// State
let selectedImage = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Create a custom file upload label
    createFileUploadLabel();
    
    // Add event listeners
    imageInput.addEventListener('change', handleImageSelect);
    scanBtn.addEventListener('click', scanReceipt);
    
    // Initially disable scan button
    scanBtn.disabled = true;
});

function createFileUploadLabel() {
    const uploadSection = document.createElement('div');
    uploadSection.className = 'upload-section';
    
    const label = document.createElement('label');
    label.className = 'file-upload-label';
    label.htmlFor = 'imageInput';
    label.textContent = 'Choose Receipt Image';
    
    const container = document.querySelector('body');
    const h1 = document.querySelector('h1');
    
    // Insert upload section after h1
    container.insertBefore(uploadSection, h1.nextSibling);
    uploadSection.appendChild(label);
    uploadSection.appendChild(imageInput);
    uploadSection.appendChild(scanBtn);
}

function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }
        
        // Create preview
        const reader = new FileReader();
        reader.onload = function(e) {
            selectedImage = e.target.result;
            showImagePreview(selectedImage);
            scanBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }
}

function showImagePreview(imageSrc) {
    // Remove existing preview
    const existingPreview = document.querySelector('.preview-image');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    // Create new preview
    const preview = document.createElement('img');
    preview.className = 'preview-image';
    preview.src = imageSrc;
    preview.alt = 'Receipt Preview';
    
    // Insert after file input
    const uploadSection = document.querySelector('.upload-section');
    uploadSection.appendChild(preview);
}

function scanReceipt() {
    if (!selectedImage) {
        alert('Please select an image first.');
        return;
    }
    
    // Show loading state
    showLoading(true);
    scanBtn.disabled = true;
    ocrText.textContent = 'Scanning receipt...';
    
    // Perform OCR using Tesseract.js
    Tesseract.recognize(
        selectedImage,
        'eng',
        {
            logger: m => console.log(m)
        }
    ).then(({ data: { text } }) => {
        // Display results
        ocrText.textContent = text;
        showLoading(false);
        scanBtn.disabled = false;
        
        // Parse and extract receipt data
        const extractedData = parseReceiptData(text);
        displayExtractedData(extractedData);
        
    }).catch(error => {
        console.error('OCR Error:', error);
        ocrText.textContent = 'Error scanning receipt. Please try again.';
        showLoading(false);
        scanBtn.disabled = false;
    });
}

function showLoading(show) {
    // Remove existing loading spinner
    const existingSpinner = document.querySelector('.loading');
    if (existingSpinner) {
        existingSpinner.remove();
    }
    
    if (show) {
        const loading = document.createElement('div');
        loading.className = 'loading show';
        loading.innerHTML = '<div class="spinner"></div><p>Processing receipt...</p>';
        
        const uploadSection = document.querySelector('.upload-section');
        uploadSection.appendChild(loading);
    }
}

function parseReceiptData(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const data = {
        total: null,
        date: null,
        items: [],
        store: null
    };
    
    // Extract total (look for patterns like $XX.XX or TOTAL: $XX.XX)
    const totalPattern = /(?:total|amount|sum)[:\s]*\$?(\d+\.\d{2})/i;
    const totalMatch = text.match(totalPattern);
    if (totalMatch) {
        data.total = parseFloat(totalMatch[1]);
    }
    
    // Extract date (look for common date patterns)
    const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/;
    const dateMatch = text.match(datePattern);
    if (dateMatch) {
        data.date = dateMatch[0];
    }
    
    // Extract store name (usually in first few lines)
    if (lines.length > 0) {
        data.store = lines[0].trim();
    }
    
    // Extract items (lines with prices)
    const itemPattern = /(.+?)\s+\$(\d+\.\d{2})/;
    lines.forEach(line => {
        const itemMatch = line.match(itemPattern);
        if (itemMatch) {
            data.items.push({
                name: itemMatch[1].trim(),
                price: parseFloat(itemMatch[2])
            });
        }
    });
    
    return data;
}

function displayExtractedData(data) {
    // Create a structured display of extracted data
    let structuredText = '=== EXTRACTED RECEIPT DATA ===\n\n';
    
    if (data.store) {
        structuredText += `Store: ${data.store}\n`;
    }
    
    if (data.date) {
        structuredText += `Date: ${data.date}\n`;
    }
    
    if (data.items.length > 0) {
        structuredText += '\nItems:\n';
        data.items.forEach(item => {
            structuredText += `  ${item.name}: $${item.price.toFixed(2)}\n`;
        });
    }
    
    if (data.total) {
        structuredText += `\nTotal: $${data.total.toFixed(2)}\n`;
    }
    
    // Add the structured data to the display
    ocrText.textContent = structuredText + '\n\n=== RAW OCR TEXT ===\n' + ocrText.textContent;
} 