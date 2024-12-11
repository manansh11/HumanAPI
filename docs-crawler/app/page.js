'use client';
import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Loader } from 'lucide-react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [expandedPages, setExpandedPages] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setExpandedPages({});

    try {
      const response = await fetch('/api/process-docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process documentation');
      }

      setResult(data);
      const initialExpandedState = {};
      data.pages.forEach((_, index) => {
        initialExpandedState[index] = false;
      });
      setExpandedPages(initialExpandedState);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (result) {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const togglePage = (index) => {
    setExpandedPages(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const renderPage = (page, index) => {
    const isExpanded = expandedPages[index];
    return (
      <div key={index} className="mb-4 border rounded-lg overflow-hidden">
        <button
          onClick={() => togglePage(index)}
          className="w-full p-4 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="font-medium">{page.title || page.url}</span>
          </div>
          <span className="text-sm text-gray-500">
            {page.sections.length} sections, {page.code_examples.length} code examples
          </span>
        </button>
        {isExpanded && (
          <div className="p-4 bg-white">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-500 mb-2">URL</h4>
              <p className="text-sm break-all">{page.url}</p>
            </div>
            {page.code_examples.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">Code Examples</h4>
                {page.code_examples.map((code, codeIndex) => (
                  <pre key={codeIndex} className="p-2 bg-gray-50 rounded text-sm mb-2 overflow-x-auto">
                    {code}
                  </pre>
                ))}
              </div>
            )}
            {page.links.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">Links</h4>
                <ul className="text-sm space-y-1">
                  {page.links.map((link, linkIndex) => (
                    <li key={linkIndex} className="break-all">
                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 mb-2">Content Sections</h4>
              {page.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mb-4">
                  <h5 className="font-medium mb-2">{section.heading}</h5>
                  <p className="text-sm whitespace-pre-wrap">{section.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Documentation Crawler</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter documentation URL"
            required
            className="flex-1 p-2 border rounded"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              'Process'
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 mb-8 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Results</h2>
              <p className="text-sm text-gray-500">
                Crawled {result.pages.length} pages at {new Date(result.crawled_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>
          <div className="space-y-4">
            {result.pages.map((page, index) => renderPage(page, index))}
          </div>
        </div>
      )}
    </main>
  );
}
