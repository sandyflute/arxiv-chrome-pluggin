document.addEventListener('DOMContentLoaded', function() {
  const paperUrlInput = document.getElementById('arxivUrl');
  const maxDepthInput = document.getElementById('maxDepth');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const loadingDiv = document.getElementById('loading');
  const resultsDiv = document.getElementById('results');
  const resultsList = document.getElementById('resultsList');
  const progressText = document.createElement('div');
  progressText.className = 'progress-text';
  loadingDiv.appendChild(progressText);

  analyzeBtn.addEventListener('click', async function() {
    const url = paperUrlInput.value.trim();
    const maxDepth = parseInt(maxDepthInput.value);
    
    if (!url) {
      showError('Please enter a paper URL');
      return;
    }

    if (!url.includes('arxiv.org/abs/')) {
      showError('Please enter a valid arXiv paper URL');
      return;
    }

    if (maxDepth < 1 || maxDepth > 10) {
      showError('Please enter a depth between 1 and 10');
      return;
    }

    // Show loading state
    loadingDiv.style.display = 'block';
    resultsDiv.style.display = 'none';
    analyzeBtn.disabled = true;
    progressText.textContent = 'Starting analysis...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeCitations',
        url: url,
        maxDepth: maxDepth
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