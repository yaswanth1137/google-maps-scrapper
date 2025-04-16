function initGoogleMapsScraper() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0];
    var actionButton = document.getElementById('actionButton');
    var downloadButton = document.getElementById('downloadCSV');
    var messageElement = document.getElementById('message');
    var scrapingSection = document.getElementById('scrapingSection');
    let scrapedData = []; // Save scraped data globally

    var resultsTable = document.getElementById('resultsTable');
    var loader = document.getElementById('loader');

    // Check if we're on Google Maps
    const isOnGoogleMaps = currentTab && currentTab.url.includes("https://www.google.com/maps/search");
    
    if (isOnGoogleMaps) {
      // User is on Google Maps search page
      messageElement.textContent = 'Lets Scrape Google Maps!';
      messageElement.classList.remove('redirect-link');
      actionButton.disabled = false;
      actionButton.classList.add('enabled');
      
      // Show scraping section
      if (scrapingSection) scrapingSection.style.display = 'block';
    } else {
      // User is NOT on Google Maps - show redirect link
      messageElement.textContent = "Go to Google Maps Search";
      messageElement.classList.add('redirect-link');
      
      // Set up click handler for redirect
      messageElement.addEventListener('click', function() {
        chrome.tabs.create({ url: 'https://www.google.com/maps/search' });
      });
      
      // Hide action button and scraping section
      actionButton.disabled = true;
      actionButton.classList.remove('enabled');
      if (scrapingSection) scrapingSection.style.display = 'none';
    }

    actionButton.addEventListener('click', function () {
      loader.style.display = 'block'; // Show loader

      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: scrapeDataWithInfiniteScroll
      }, function (results) {
        loader.style.display = 'none'; // Hide loader
        downloadButton.style.display = 'inline-block'; // Show download button

        if (!results || !results[0] || !results[0].result) return;

        scrapedData = results[0].result; // Save data globally

        resultsTable.innerHTML = `
          <thead>
            <tr>
              <th>Title</th>
              <th>Rating</th>
              <th>Review Count</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Company URL</th>
              <th>Info</th>
              <th>Timings</th>
            </tr>
          </thead>
          <tbody></tbody>`;

        const tbody = resultsTable.querySelector('tbody');

        results[0].result.forEach(function (item) {
          var row = document.createElement('tr');
          ['title', 'rating', 'reviewCount', 'address', 'phone', 'companyUrl', 'href', 'timings'].forEach(function (key) {
            var cell = document.createElement('td');
            if (key === 'href' && item[key] !== 'N/A') {
              const link = document.createElement('a');
              link.href = item[key];
              link.textContent = 'Link';
              link.target = '_blank';
              cell.appendChild(link);
            } else if (key === 'companyUrl' && item[key] !== 'N/A') {
              const link = document.createElement('a');
              link.href = item[key];
              link.textContent = 'Lets Go';
              link.target = '_blank';
              cell.appendChild(link);
            } else {
              cell.textContent = item[key] || 'N/A';
            }
            row.appendChild(cell);
          });
          tbody.appendChild(row);
        });
      });
    });

    // Move the download button event listener inside DOMContentLoaded
    downloadButton.addEventListener('click', function () {
      if (scrapedData.length === 0) {
        alert('No data to download. Please scrape data first.');
        return;
      }

      // Define fields properly matching the data structure
      const headers = ['Title', 'Rating', 'Review Count', 'Address', 'Phone', 'Company URL', 'Info', 'Timings'];
      
      // Improved CSV generation with better encoding handling
      const csvRows = [
        headers.join(',')
      ];
      
      scrapedData.forEach(item => {
        const row = [];
        // Process each field properly for CSV format
        ['title', 'rating', 'reviewCount', 'address', 'phone', 'companyUrl', 'href', 'timings'].forEach(key => {
          let val = item[key] || 'N/A';
          // Properly sanitize values for CSV
          val = String(val)
            .replace(/"/g, '""') // Escape double quotes
            .replace(/\n/g, ' '); // Replace newlines with spaces
          
          row.push(`"${val}"`); // Quote all values for safety
        });
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'google_maps_results.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  });
};

// Keep the function outside DOMContentLoaded as it needs to be available for executeScript
async function scrapeDataWithInfiniteScroll() {
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper function to determine if text is likely an address
  function isLikelyAddress(text) {
    if (!text) return false;
    
    // Avoid elements that are clearly not addresses
    if (text.match(/^\d\.\d/) || // Rating format like 4.5
        text.match(/^open|^closed/i) || // Opening hours
        text.length < 5 || // Too short to be an address
        text.includes('stars') ||
        text.includes('reviews')) {
      return false;
    }
    
    // Positive indicators of an address
    return (
      (text.includes(',') && text.length > 10) || // Contains commas and reasonably long
      /\d+\s+\w+\s+(st|street|ave|avenue|blvd|boulevard|rd|road|ln|lane|dr|drive|way|pl|place|ct|court)/i.test(text) || // US format
      /\d+[a-z]?\s*,\s*\w+/i.test(text) || // Number followed by comma and word
      /(district|sector|block|area|colony|nagar|road|marg|highway|expressway)/i.test(text) || // Common terms in Indian addresses
      /\w+\s+(street|avenue|boulevard|road|lane|drive|way|place|court)/i.test(text) // Street name format
    );
  }
  
  // Helper function to determine if text is likely a phone number
  function isLikelyPhoneNumber(text) {
    if (!text) return false;

    const cleanedText = text.replace(/[^\d+\s()-]/g, '').trim();
    
    // Short number that's commonly mistaken as phone but is likely address number
    if (/^\d{1,4}$/.test(cleanedText)) {
      return false;
    }
    
    // Common phone number formats
    return (
      /\+?(\d[\s-]?){7,15}/.test(text) || // Standard format with different separators
      /\(\d{2,5}\)[\s-]?\d{3,8}/.test(text) || // Format with parentheses 
      /\+\d{1,3}[\s-]?\d{6,12}/.test(text) || // International format
      /^0\d{9,12}/.test(text) || // Format starting with 0 (UK, Australia)
      /^\d{3}-\d{3}-\d{4}/.test(text) || // US format with dashes
      /^\d{5}\s\d{5}/.test(text) || // Indian format with space
      /^\+91[\s-]?\d{10}/.test(text) || // Specific Indian format
      /^[6-9]\d{9}$/.test(cleanedText) || // Indian 10-digit mobile
      /^0\d{2,4}[\s-]?\d{6,8}$/.test(cleanedText) || // Indian landline with STD code
      /^\+91[\s-]?[6-9]\d{9}$/.test(cleanedText) || // Indian mobile with country code
      /^\d{5}[\s-]\d{5}$/.test(cleanedText) // Indian format with space in middle
    );
  }

  // Helper function to sanitize text and fix encoding issues
  function sanitizeText(text) {
    if (!text) return '';
    
    // Replace common problematic characters and encoding issues
    return text
      .replace(/[\u2018\u2019]/g, "'") // Smart quotes
      .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
      .replace(/\u2013/g, '-') // En dash
      .replace(/\u2014/g, '--') // Em dash
      .replace(/\u2026/g, '...') // Ellipsis
      .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ') // Various space characters
      .replace(/â€"/g, '-') // Encoding issue with dash
      .replace(/â€œ/g, '"') // Encoding issue with opening quote
      .replace(/â€/g, '"') // Encoding issue with closing quote
      .replace(/â€˜/g, "'") // Encoding issue with apostrophe
      .replace(/â€™/g, "'") // Encoding issue with apostrophe
      .replace(/â€¦/g, "...") // Encoding issue with ellipsis
      .trim();
  }

  const scrollContainer = document.querySelector('[role="feed"]');
  if (!scrollContainer) return [];

  let previousHeight = 0;
  let unchangedScrolls = 0;
  const maxUnchanged = 5; // Number of scrolls with no change before stopping

  while (true) {
    scrollContainer.scrollTo(0, scrollContainer.scrollHeight);
    await sleep(1000); // wait for new results

    const currentHeight = scrollContainer.scrollHeight;

    if (currentHeight === previousHeight) {
      unchangedScrolls++;
      if (unchangedScrolls >= maxUnchanged) break; // exit if no change in height for a while
    } else {
      unchangedScrolls = 0;
    }

    previousHeight = currentHeight;
  }

  // Scrape after scrolling is done
  const links = Array.from(document.querySelectorAll("a[href^='https://www.google.com/maps/place/']"));

  const results = links.map(link => {
    try {
      // Find container with improved error handling
      let container = link.closest('[jsaction*="mouseover:pane"]');
      // Try alternative container selections if the current one isn't working
      if (!container) {
        container = link.closest('[role="article"]') || 
                    link.closest('.section-result-content') ||
                    link.closest('[jsaction*="mouseover"]');
      }
      if (!container) return null; // Skip if still no container found
      
      // Title
      let titleText = 'N/A';
      const titleEl = container.querySelector('[aria-label]');
      if (titleEl) titleText = sanitizeText(titleEl.getAttribute('aria-label') || 'N/A');

      // Rating + Review count - IMPROVED
      let rating = 'N/A';
      let reviewCount = 'N/A';
      
      // Find rating - multiple selector strategies
      const ratingSelectors = ['.MW4etd', '[aria-label*="stars"]', '[aria-label*="rating"]', '.fontBodyMedium [role="img"]'];
      
      for (const selector of ratingSelectors) {
        const ratingEl = container.querySelector(selector);
        if (ratingEl) {
          // Try aria-label first, which often contains the exact rating
          const ariaLabel = ratingEl.getAttribute('aria-label');
          if (ariaLabel) {
            const ratingMatch = ariaLabel.match(/(\d+(\.\d+)?)\s*star/i);
            if (ratingMatch) {
              rating = ratingMatch[1];
              break;
            }
          }
          
          // Fallback to text content
          const ratingText = ratingEl.textContent.trim();
          if (ratingText && /^\d+(\.\d+)?$/.test(ratingText)) {
            rating = ratingText;
            break;
          }
        }
      }
      
      // IMPROVED: Find review count using multiple strategies
      // Strategy 1: Look for review count near rating
      const reviewSelectors = [
        '.UY7F9', // Original selector
        '[aria-label*="review"]',
        '.fontBodyMedium span:not([class])',
        '.fontBodySmall [aria-label*="review"]',
        '.fontBodySmall span:not([aria-label*="star"])'
      ];
      
      for (const selector of reviewSelectors) {
        const reviewEls = container.querySelectorAll(selector);
        
        for (const el of reviewEls) {
          const reviewText = el.textContent.trim();
          
          // Look for text that looks like review counts
          // Common patterns: "(123)", "123 reviews", "123"
          const reviewMatches = [
            reviewText.match(/\(([0-9,]+)\)/), // (123)
            reviewText.match(/([0-9,]+)\s+review/i), // 123 reviews
            reviewText.match(/^([0-9,]+)$/) // Just numbers
          ].filter(Boolean);
          
          if (reviewMatches.length > 0) {
            reviewCount = reviewMatches[0][1].replace(/,/g, ''); // Remove commas
            break;
          }
        }
        
        if (reviewCount !== 'N/A') break;
      }
      
      // Strategy 2: Look for review count in aria-label
      if (reviewCount === 'N/A') {
        const elementsWithAriaLabel = Array.from(container.querySelectorAll('[aria-label]'));
        
        for (const el of elementsWithAriaLabel) {
          const ariaLabel = el.getAttribute('aria-label') || '';
          const reviewMatch = ariaLabel.match(/([0-9,]+)\s+review/i);
          
          if (reviewMatch) {
            reviewCount = reviewMatch[1].replace(/,/g, '');
            break;
          }
        }
      }
      
      // Strategy 3: Try to extract from text that mentions both rating and reviews
      if (reviewCount === 'N/A') {
        const allTextElements = Array.from(container.querySelectorAll('*'))
          .map(el => el.textContent.trim())
          .filter(text => text.length > 0);
          
        for (const text of allTextElements) {
          // Look for patterns like "4.5 stars · 123 reviews"
          const fullMatch = text.match(/\d+(\.\d+)?\s*stars?\s*[·•\-\s]\s*([0-9,]+)\s*reviews?/i);
          if (fullMatch) {
            reviewCount = fullMatch[2].replace(/,/g, '');
            break;
          }
        }
      }
      
      // Extract all text elements from the container
      const allTextElements = Array.from(container.querySelectorAll('*'))
        .filter(el => {
          // Only get elements that directly contain text (not just container elements)
          return Array.from(el.childNodes).some(node => node.nodeType === 3 && node.textContent.trim().length > 0);
        })
        .map(el => sanitizeText(el.textContent.trim()))
        .filter(text => text.length > 0);
      
      // Deduplicate text elements
      const uniqueTextElements = [...new Set(allTextElements)];
      
      // ADDRESS: Multiple strategies to find address
      let address = 'N/A';
      
      // Strategy 1: Find elements specifically marked as address
      const addressElements = Array.from(container.querySelectorAll('[data-item-id="address"]'));
      if (addressElements.length > 0) {
        address = sanitizeText(addressElements[0].textContent.trim());
      }
      
      // Strategy 2: Look for text in buttons that might copy address
      if (address === 'N/A') {
        const buttons = Array.from(container.querySelectorAll('button'));
        const addressButtons = buttons.filter(btn => {
          const ariaLabel = btn.getAttribute('aria-label') || '';
          return ariaLabel.includes('address') || ariaLabel.includes('location');
        });
        
        if (addressButtons.length > 0) {
          const ariaLabel = addressButtons[0].getAttribute('aria-label') || '';
          if (ariaLabel.includes('Copy address:')) {
            address = sanitizeText(ariaLabel.replace('Copy address:', '').trim());
          } else {
            address = sanitizeText(addressButtons[0].textContent.trim());
          }
        }
      }
      
      // Strategy 3: Look through all text elements for likely addresses
      if (address === 'N/A') {
        // Filter for elements that look like addresses
        const addressCandidates = uniqueTextElements
          .filter(text => isLikelyAddress(text))
          .sort((a, b) => b.length - a.length); // Sort by length (longer likely more complete)
        
        if (addressCandidates.length > 0) {
          address = addressCandidates[0];
        }
      }
      
      // Strategy 4: For DC and other US locations, look for specific patterns
      if (address === 'N/A') {
        // Look for elements matching common US address patterns
        const usAddressCandidates = uniqueTextElements.filter(text => 
          /\d+\s+\w+\s+(st|street|ave|avenue|blvd|boulevard|rd|road|nw|ne|sw|se)/i.test(text) ||
          /\d+\s+\w+\s+\w+/i.test(text) && text.length > 10
        );
        
        if (usAddressCandidates.length > 0) {
          address = usAddressCandidates[0];
        }
      }

      // PHONE: Enhanced phone number detection
      let phone = 'N/A';

      // 1. First try direct element selection
      const phoneElements = Array.from(container.querySelectorAll(
        '[data-item-id="phone"], [aria-label*="phone"], [aria-label*="call"], [aria-label*="telefon"], [aria-label*="téléphone"], [aria-label*="फोन"]'
      ));
      if (phoneElements.length > 0) {
        phone = sanitizeText(phoneElements[0].textContent.trim());
      }

      // 2. Check for tel: links
      if (phone === 'N/A') {
        const telLinks = Array.from(container.querySelectorAll('a[href^="tel:"]'));
        if (telLinks.length > 0) {
          phone = sanitizeText(telLinks[0].getAttribute('href').replace('tel:', '').trim());
        }
      }

      // 3. Check buttons with phone-related actions
      if (phone === 'N/A') {
        const phoneButtons = Array.from(container.querySelectorAll(
          'button[jsaction*="call"], button[jsaction*="phone"], [data-tooltip*="call"], [data-tooltip*="phone"]'
        ));
        for (const btn of phoneButtons) {
          const text = btn.textContent.trim();
          if (text && text.match(/\d/)) {
            phone = sanitizeText(text);
            break;
          }
        }
      }

      // 4. Comprehensive text pattern matching
      if (phone === 'N/A') {
        // Get all text content from the container
        const allText = container.textContent || '';
        
        // Global phone number patterns (including specific Indian formats)
        const phonePatterns = [
          // Indian formats
          /(?:\+91[\s-]?)?[6-9]\d{9}/, // Mobile numbers
          /\d{5}[\s-]\d{5}/, // Common spaced format
          /0\d{2,4}[\s-]?\d{6,8}/, // Landline with STD code
          
          // International formats
          /\+?\d{1,4}[\s-]?\(?\d{2,5}\)?[\s-]?\d{3,8}/, // With country/area codes
          /\d{3}[\s-]\d{3}[\s-]\d{4}/, // US/Canada format
          /\(\d{2,5}\)[\s-]?\d{3,8}/, // With parentheses
          /\d{4}[\s-]\d{3}[\s-]\d{3}/, // European format
          /\d{2}[\s-]\d{4}[\s-]\d{4}/, // Japanese format
          /[6-9]\d{9}/, // Plain Indian mobile
          /\d{7,15}/ // Generic long number
        ];

        // Find all potential matches
        const matches = [];
        phonePatterns.forEach(pattern => {
          const found = allText.match(pattern);
          if (found) matches.push(found[0]);
        });

        // Select the best match (prioritize numbers with country codes)
        if (matches.length > 0) {
          phone = sanitizeText(matches.sort((a, b) => {
            const aScore = (a.includes('+') ? 2 : 0) + a.replace(/\D/g, '').length;
            const bScore = (b.includes('+') ? 2 : 0) + b.replace(/\D/g, '').length;
            return bScore - aScore;
          })[0]);
        }
      }

      // Company URL - external website link
      let companyUrl = 'N/A';
      
      // First try to find website button
      const websiteEl = container.querySelector('[data-item-id="authority"]');
      if (websiteEl) {
        const href = websiteEl.getAttribute('href');
        if (href && !href.startsWith('https://www.google.com')) {
          companyUrl = href;
        }
      }
      
      // If no specific website button, look for other external links
      if (companyUrl === 'N/A') {
        const allLinks = Array.from(container.querySelectorAll('a[href]'));
        const externalLinks = allLinks.filter(a => 
          a.href && 
          !a.href.startsWith('https://www.google.com/maps/') &&
          !a.href.startsWith('https://food.google.com/') &&
          !a.href.includes('goo.gl')
        );
        
        if (externalLinks.length > 0) {
          companyUrl = externalLinks[0].href;
        }
      }
      
      // IMPROVED: Timings (open/close summary) with encoding fixes
      let timings = 'N/A';

      // Strategy 1: Look for elements with hour-related aria-labels
      const hourElements = Array.from(container.querySelectorAll('[aria-label*="hours" i], [aria-label*="open" i], [aria-label*="closed" i]'));
      if (hourElements.length > 0) {
        timings = sanitizeText(hourElements[0].textContent.trim());
      }

      // Strategy 2: Look for elements that might contain hours information based on text content
      if (timings === 'N/A') {
        const timingCandidates = uniqueTextElements.filter(text => 
          /^(open|closed)[\s⋅]/i.test(text) || 
          /^hours:/i.test(text) ||
          /\d{1,2}:\d{2}\s*(am|pm)/i.test(text) ||
          /\d{1,2}\s*(am|pm)/i.test(text) ||
          /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(text)
        );
        
        if (timingCandidates.length > 0) {
          timings = timingCandidates[0];
        }
      }

      // Strategy 3: Look for specific hour display elements by their structure in the DOM
      if (timings === 'N/A') {
        // In Google Maps, hours often appear in specific sections
        const hourContainers = Array.from(container.querySelectorAll('[jsaction*="expand"] span, [jsaction*="time"] span, [jsaction*="hours"] span'));
        
        for (const el of hourContainers) {
          const text = sanitizeText(el.textContent.trim());
          if (text.match(/open|closed|hours/i) || text.match(/\d{1,2}:\d{2}\s*(am|pm)/i)) {
            timings = text;
            break;
          }
        }
      }

      // Strategy 4: Check for special timing patterns
      if (timings === 'N/A') {
        const openingPatterns = uniqueTextElements.filter(text => 
          /opens\s+at\s+\d{1,2}/i.test(text) || 
          /closes\s+at\s+\d{1,2}/i.test(text) ||
          /open\s+\d{1,2}/i.test(text) ||
          /close\s+\d{1,2}/i.test(text)
        );
        
        if (openingPatterns.length > 0) {
          timings = openingPatterns[0];
        }
      }

      return {
        title: titleText,
        rating: rating,
        reviewCount: reviewCount,
        address: address,
        phone: phone,
        companyUrl: companyUrl,
        href: link.href,
        timings: timings
      };
    } catch (error) {
      console.error("Error processing item:", error);
      return null;
    }
  }).filter(item => item !== null);

  return results;
}
// Make sure the function runs when the popup is loaded
document.addEventListener('DOMContentLoaded', function() {
  initGoogleMapsScraper();
});