// Cache to store already processed papers in memory
const processedPapers = new Set();

// Function to extract arXiv ID from URL
function extractArxivId(url) {
  const match = url.match(/arxiv\.org\/abs\/(\d+\.\d+)/);
  return match ? match[1] : null;
}

// Function to extract arXiv IDs from text
function extractArxivIds(text) {
  const citations = new Set();
  
  // Match various arXiv citation formats
  const patterns = [
    /arXiv:(\d+\.\d+)/g,                    // arXiv:1234.5678
    /\[(\d+\.\d+)\]/g,                      // [1234.5678]
    /(\d+\.\d+)/g,                          // 1234.5678
    /arxiv\.org\/abs\/(\d+\.\d+)/g,         // arxiv.org/abs/1234.5678
    /arXiv:(\d{4}\.\d{4,5})/g,              // arXiv:1234.56789
    /\[arXiv:(\d{4}\.\d{4,5})\]/g,          // [arXiv:1234.56789]
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const id = match[1];
      // Validate the ID format
      if (/^\d{4}\.\d{4,5}$/.test(id)) {
        citations.add(id);
      }
    }
  }

  return Array.from(citations);
}

// Function to extract text between XML tags
function extractXmlContent(xml, tagName) {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

// Function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to get cached paper data
async function getCachedPaperData(arxivId) {
  try {
    const result = await chrome.storage.local.get(arxivId);
    return result[arxivId] || null;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

// Function to cache paper data
async function cachePaperData(arxivId, data) {
  try {
    await chrome.storage.local.set({ [arxivId]: data });
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}

// Function to fetch paper data from Semantic Scholar API with retry logic and caching
async function fetchPaperData(arxivId, retryCount = 0) {
  try {
    console.log('Fetching data for arXiv ID:', arxivId);
    
    // Check cache first
    const cachedData = await getCachedPaperData(arxivId);
    if (cachedData) {
      console.log('Using cached data for:', arxivId);
      return cachedData;
    }
    
    // Add delay between requests to avoid rate limiting
    await delay(1000 + (retryCount * 1000)); // Exponential backoff
    
    // Fetch metadata from Semantic Scholar API
    const apiResponse = await fetch(`https://api.semanticscholar.org/v1/paper/arXiv:${arxivId}`);
    
    if (apiResponse.status === 429) {
      if (retryCount < 3) {
        console.log(`Rate limited, retrying after delay... (attempt ${retryCount + 1})`);
        return fetchPaperData(arxivId, retryCount + 1);
      } else {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
    }
    
    if (!apiResponse.ok) {
      throw new Error(`HTTP error! status: ${apiResponse.status}`);
    }
    
    const data = await apiResponse.json();
    
    if (!data.title) {
      throw new Error('Missing required paper data');
    }

    // Extract citations
    const citations = new Set();
    
    // Add cited papers
    if (data.references) {
      data.references.forEach(ref => {
        if (ref.arxivId) {
          citations.add(ref.arxivId);
        }
      });
    }
    
    const citationsArray = Array.from(citations);
    console.log(`Found ${citationsArray.length} citations for paper: ${data.title}`);

    const paperData = {
      title: data.title,
      citations: citationsArray,
      timestamp: Date.now() // Add timestamp for cache invalidation
    };

    // Cache the paper data
    await cachePaperData(arxivId, paperData);

    return paperData;
  } catch (error) {
    console.error('Error fetching paper data:', error);
    return null;
  }
}

// Function to process a batch of citations in parallel
async function processBatch(citationIds, level, maxLevel) {
  const batchSize = 3; // Reduced batch size to avoid rate limiting
  const results = {};
  
  for (let i = 0; i < citationIds.length; i += batchSize) {
    const batch = citationIds.slice(i, i + batchSize);
    const batchPromises = batch.map(async (citationId) => {
      const citationUrl = `https://arxiv.org/abs/${citationId}`;
      return analyzeCitations(citationUrl, level, maxLevel);
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Merge results from this batch
    batchResults.forEach(result => {
      for (const [title, count] of Object.entries(result)) {
        results[title] = (results[title] || 0) + count;
      }
    });
    
    // Add delay between batches
    if (i + batchSize < citationIds.length) {
      await delay(2000);
    }
  }
  
  return results;
}

// Function to recursively analyze citations
async function analyzeCitations(url, level = 0, maxLevel = 5) {
  const arxivId = extractArxivId(url);
  if (!arxivId || processedPapers.has(arxivId)) return {};

  processedPapers.add(arxivId);
  const paperData = await fetchPaperData(arxivId);
  if (!paperData) return {};

  const citations = {};
  citations[paperData.title] = (citations[paperData.title] || 0) + 1;

  if (level < maxLevel && paperData.citations.length > 0) {
    const subCitations = await processBatch(paperData.citations, level + 1, maxLevel);
    
    // Merge citation counts
    for (const [title, count] of Object.entries(subCitations)) {
      citations[title] = (citations[title] || 0) + count;
    }
  }

  return citations;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeCitations') {
    // Clear processed papers cache (in-memory cache)
    processedPapers.clear();
    
    // Start analysis with the specified max depth
    analyzeCitations(request.url, 0, request.maxDepth)
      .then(citations => {
        if (!citations || Object.keys(citations).length === 0) {
          sendResponse({ error: 'No citations found for this paper. Please check if the paper contains arXiv citations.' });
          return;
        }
        sendResponse({ citations });
      })
      .catch(error => {
        console.error('Analysis error:', error);
        sendResponse({ error: error.message || 'Failed to analyze citations' });
      });
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
}); 