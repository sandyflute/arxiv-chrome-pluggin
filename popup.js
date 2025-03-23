document.addEventListener('DOMContentLoaded', function() {
  const arxivUrlInput = document.getElementById('arxivUrl');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const loadingDiv = document.getElementById('loading');
  const resultsDiv = document.getElementById('results');
  const resultsList = document.getElementById('resultsList');

  analyzeBtn.addEventListener('click', async function() {
    const url = arxivUrlInput.value.trim();
    
    if (!url) {
      alert('Please enter an arXiv paper URL');
      return;
    }

    if (!url.includes('arxiv.org/abs/')) {
      alert('Please enter a valid arXiv paper URL (e.g., https://arxiv.org/abs/1234.5678)');
      return;
    }

    // Show loading state
    loadingDiv.style.display = 'block';
    resultsDiv.style.display = 'none';
    analyzeBtn.disabled = true;

    try {
      // Send message to background script to start analysis
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeCitations',
        url: url
      });

      // Display results
      displayResults(response.citations);
    } catch (error) {
      alert('Error analyzing citations: ' + error.message);
    } finally {
      // Hide loading state
      loadingDiv.style.display = 'none';
      analyzeBtn.disabled = false;
    }
  });

  function displayResults(citations) {
    resultsDiv.style.display = 'block';
    resultsList.innerHTML = '';

    // Sort citations by count
    const sortedCitations = Object.entries(citations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    sortedCitations.forEach(([title, count], index) => {
      const paperDiv = document.createElement('div');
      paperDiv.className = 'paper-item';
      paperDiv.innerHTML = `
        <div class="paper-title">${index + 1}. ${title}</div>
        <div class="citation-count">Cited ${count} times</div>
      `;
      resultsList.appendChild(paperDiv);
    });
  }
}); 