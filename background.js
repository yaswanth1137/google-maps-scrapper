// Simple background script for Google Maps Scraper
console.log('Google Maps Scraper extension background script loaded');

// Initialize storage on installation
chrome.runtime.onInstalled.addListener(function() {
  console.log('Extension installed');
  chrome.storage.local.set({scrapedData: []});
});

// Message passing system
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('Message received in background:', message);
  
  // Forward status updates to popup
  if (message.action === 'updateStatus') {
    try {
      // Try to forward message to popup if it's open
      chrome.runtime.sendMessage(message).catch(function(error) {
        // Suppress errors when popup is not open
        console.log('Could not forward message (popup probably closed)');
      });
    } catch (error) {
      console.error('Error forwarding message:', error);
    }
  }
  
  // Always return true for async response
  return true;
});