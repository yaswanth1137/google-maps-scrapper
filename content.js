chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (Request.action === "extractlinks") {
    const links = Array.from(document.querySelectorAll("a[href*='https://www.google.com/maps/place/']"))
      .map(link => link.href);
    sendResponse({ links: links });  
  }
}); 