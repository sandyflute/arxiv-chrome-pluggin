// Cache to store already processed papers
const processedPapers = new Set();

// Function to extract arXiv ID from URL
function extractArxivId(url) {
  const match = url.match(/arxiv\.org\/abs\/(\d+\.\d+)/);
  return match ? match[1] : null;
}

// Function to fetch paper data from arXiv API
async function fetchPaperData(arxivId) {
  const response = await fetch(`https://export.arxiv.org/api/query?id_list=${arxivId}`);
  const text = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');
  
  const entry = xmlDoc.querySelector('entry');
  if (!entry) return null;

  const title = entry.querySelector('title').textContent;
  const abstract = entry.querySelector('summary').textContent;
  
  // Extract citations from abstract (looking for arXiv IDs)
  const citations = [];
  const citationRegex = /arXiv:(\d+\.\d+)/g;
  let match;
  while ((match = citationRegex.exec(abstract)) !== null) {
    citations.push(match[1]);
  }

  return {
    title,
    citations
  };
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

  if (level < maxLevel) {
    for (const citationId of paperData.citations) {
      const citationUrl = `https://arxiv.org/abs/${citationId}`;
      const subCitations = await analyzeCitations(citationUrl, level + 1, maxLevel);
      
      // Merge citation counts
      for (const [title, count] of Object.entries(subCitations)) {
        citations[title] = (citations[title] || 0) + count;
      }
    }
  }

  return citations;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeCitations') {
    // Clear processed papers cache
    processedPapers.clear();
    
    // Start analysis
    analyzeCitations(request.url)
      .then(citations => {
        sendResponse({ citations });
      })
      .catch(error => {
        sendResponse({ error: error.message });
      });
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
}); 