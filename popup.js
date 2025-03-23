document.addEventListener('DOMContentLoaded', function() {
  const arxivUrlInput = document.getElementById('arxivUrl');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const loadingDiv = document.getElementById('loading');
  const resultsDiv = document.getElementById('results');
  const resultsList = document.getElementById('resultsList');

  analyzeBtn.addEventListener('click', async function() {
    const url = arxivUrlInput.value.trim();
    
    if (!url) {
      showError('Please enter an arXiv paper URL');
      return;
    }

    if (!url.includes('arxiv.org/abs/')) {
      showError('Please enter a valid arXiv paper URL (e.g., https://arxiv.org/abs/1234.5678)');
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

      if (response.error) {
        showError(response.error);
        return;
      }

      // Display results
      displayResults(response.citations);
    } catch (error) {
      showError('Error analyzing citations: ' + (error.message || 'Unknown error occurred'));
    } finally {
      // Hide loading state
      loadingDiv.style.display = 'none';
      analyzeBtn.disabled = false;
    }
  });

  function showError(message) {
    resultsDiv.style.display = 'block';
    resultsList.innerHTML = `
      <div class="error-message">
        ${message}
      </div>
    `;
  }

  function displayResults(citations) {
    resultsDiv.style.display = 'block';
    resultsList.innerHTML = '';

    if (!citations || Object.keys(citations).length === 0) {
      showError('No citations found for this paper');
      return;
    }

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