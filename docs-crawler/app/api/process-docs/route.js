import axios from 'axios';
import cheerio from 'cheerio';

export async function POST(req) {
  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY is not set in environment variables');
      return new Response(JSON.stringify({ error: 'API key configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Get all URLs using map endpoint
    console.log('Getting site map from Firecrawl API for URL:', url);
    const mapResponse = await axios.post(
      'https://api.firecrawl.dev/v1/map',
      {
        url,
        options: {
          maxDepth: 3,
          followLinks: true,
          sameDomain: true
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!mapResponse.data.links || !Array.isArray(mapResponse.data.links)) {
      throw new Error('Failed to get site map');
    }

    // Filter URLs to only include documentation pages
    const baseUrl = new URL(url).origin;
    const urls = mapResponse.data.links.filter(link =>
      link.startsWith(baseUrl) &&
      !link.includes('#') && // Exclude anchor links
      !link.includes('?') && // Exclude query parameters
      link !== url // Exclude the original URL
    );
    console.log(`Found ${urls.length} URLs to crawl`);

    // Step 2: Crawl each URL and collect content
    const pages = [];
    for (const pageUrl of urls) {
      console.log(`Crawling URL: ${pageUrl}`);
      const crawlResponse = await axios.post(
        'https://api.firecrawl.dev/v1/scrape',
        {
          url: pageUrl,
          formats: ['markdown', 'html'],
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!crawlResponse.data.success) {
        console.error(`Failed to crawl ${pageUrl}:`, crawlResponse.data.error);
        continue;
      }

      const $ = cheerio.load(crawlResponse.data.data.html);

      // Extract code examples
      const codeExamples = [];
      $('pre code').each((_, element) => {
        const code = $(element).text().trim();
        if (code) {
          codeExamples.push(code);
        }
      });

      // Extract links
      const links = [];
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          // Convert relative URLs to absolute
          const absoluteUrl = new URL(href, pageUrl).toString();
          links.push(absoluteUrl);
        }
      });

      // Process markdown content into sections
      const sections = crawlResponse.data.data.markdown
        .split('\n#')
        .map(section => {
          const [heading, ...contentLines] = section.split('\n');
          return {
            heading: heading.trim().replace(/^#+\s*/, ''),
            content: contentLines.join('\n').trim()
          };
        })
        .filter(section => section.heading && section.content);

      pages.push({
        url: pageUrl,
        title: crawlResponse.data.data.metadata?.title || '',
        code_examples: codeExamples,
        links: [...new Set(links)], // Remove duplicate links
        sections
      });
    }

    // Step 3: Create final result object
    const result = {
      source_url: url,
      crawled_at: new Date().toISOString(),
      pages
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing documentation:', error.message);
    console.error('Full error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process documentation',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
