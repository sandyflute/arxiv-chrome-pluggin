# arXiv Citation Analyzer

A Chrome extension that analyzes citation networks from arXiv papers. The extension traverses through paper citations recursively and identifies the most frequently cited papers in the network.

## Features

- Analyze citation networks up to N levels deep
- Extract citations from both paper references and citations
- Cache results to improve performance
- Rate limiting protection with exponential backoff
- Display top 10 most cited papers
- Support for various arXiv citation formats

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage

1. Navigate to any arXiv paper page (e.g., https://arxiv.org/abs/1706.03762)
2. Click the extension icon in your Chrome toolbar
3. The paper URL will be automatically populated
4. Set the desired maximum depth (1-10) for citation analysis
5. Click "Analyze Citations"
6. Wait for the analysis to complete
7. View the top 10 most cited papers in the network

## Technical Details

### Components

- `manifest.json`: Extension configuration and permissions
- `popup.html`: User interface for the extension
- `popup.js`: Handles user interactions and displays results
- `background.js`: Core citation analysis logic
- `styles.css`: Extension styling

### Citation Detection

The extension supports multiple citation formats:
```
- arXiv:1234.5678
- [1234.5678]
- 1234.5678
- arxiv.org/abs/1234.5678
- arXiv:1234.56789
- [arXiv:1234.56789]
```

### API Integration

The extension uses the Semantic Scholar API to fetch paper metadata and citations:
- Base URL: `https://api.semanticscholar.org/v1/paper/arXiv:{id}`
- Rate limiting protection with exponential backoff
- Maximum 3 retry attempts

### Caching

Two levels of caching are implemented:
1. In-memory cache using `Set` for processed papers during analysis
2. Chrome storage cache for paper data with 24-hour expiration

### Performance Optimizations

- Batch processing of citations (3 papers at a time)
- Delays between API requests to prevent rate limiting
- Parallel processing of citation batches
- Caching of paper data to reduce API calls

## Error Handling

The extension handles various error cases:
- Invalid arXiv URLs
- Rate limiting from the Semantic Scholar API
- Missing paper data
- Network errors
- Invalid depth values

## Limitations

1. Only works with arXiv papers
2. Maximum depth of 10 levels
3. Limited to papers available on Semantic Scholar
4. Rate limited by the Semantic Scholar API
5. Only shows top 10 most cited papers

## Development

### Prerequisites

- Chrome browser
- Basic understanding of JavaScript and Chrome extension development

### Project Structure

```
├── manifest.json
├── popup.html
├── popup.js
├── background.js
├── styles.css
└── README.md
```

### Key Functions

#### background.js

- `extractArxivId(url)`: Extracts arXiv ID from paper URL
- `extractArxivIds(text)`: Extracts arXiv IDs from text using various patterns
- `fetchPaperData(arxivId)`: Fetches paper metadata from Semantic Scholar API
- `analyzeCitations(url, level, maxLevel)`: Recursively analyzes citation network
- `processBatch(citationIds, level, maxLevel)`: Processes citations in batches

#### popup.js

- Handles user interface interactions
- Manages loading states
- Displays results and error messages
- Formats citation counts and paper titles

### Building and Testing

1. Make changes to the source code
2. Reload the extension in Chrome
3. Test with various arXiv papers
4. Check console for debugging information

## Troubleshooting

Common issues and solutions:

1. **No citations found**
   - Verify the paper has arXiv citations
   - Check if the paper is available on Semantic Scholar

2. **Rate limiting**
   - Wait a few minutes before trying again
   - Reduce the maximum depth

3. **Slow analysis**
   - Reduce the maximum depth
   - Check your internet connection
   - Clear the extension cache

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the MIT License.

## Credits

- Uses the [Semantic Scholar API](https://www.semanticscholar.org/product/api)
- Built for the arXiv research community 