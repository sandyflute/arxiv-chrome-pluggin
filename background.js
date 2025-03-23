// Cache to store already processed papers
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

// Function to extract references from arXiv API response
function extractReferences(xml) {
  const references = [];
  const referencesRegex = /<arxiv:journal_ref>(.*?)<\/arxiv:journal_ref>/g;
  let match;
  
  while ((match = referencesRegex.exec(xml)) !== null) {
    const ref = match[1].trim();
    if (ref) {
      references.push(ref);
    }
  }
  
  return references;
}

// Function to fetch paper data from arXiv API
async function fetchPaperData(arxivId) {
  try {
    console.log('Fetching data for arXiv ID:', arxivId);
    
    // Fetch metadata from arXiv API
    const apiResponse = await fetch(`https://export.arxiv.org/api/query?id_list=${arxivId}`);
    if (!apiResponse.ok) {
      throw new Error(`HTTP error! status: ${apiResponse.status}`);
    }
    const xmlText = await apiResponse.text();
    
    // Extract title, abstract, and references
    const title = extractXmlContent(xmlText, 'title');
    const abstract = extractXmlContent(xmlText, 'summary');
    const references = extractReferences(xmlText);
    
    if (!title || !abstract) {
      throw new Error('Missing required paper data');
    }

    // Extract citations from references
    const citations = new Set();
    for (const ref of references) {
      const ids = extractArxivIds(ref);
      ids.forEach(id => citations.add(id));
    }
    
    const citationsArray = Array.from(citations);
    console.log(`Found ${citationsArray.length} citations for paper: ${title}`);
    console.log('Citations:', citationsArray);
    console.log('References:', references);

    return {
      title,
      citations: citationsArray
    };
  } catch (error) {
    console.error('Error fetching paper data:', error);
    return null;
  }
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