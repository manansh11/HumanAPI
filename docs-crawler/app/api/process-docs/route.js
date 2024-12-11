import axios from 'axios';

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

    console.log('Making request to Firecrawl API for URL:', url);
    const firecrawlResponse = await axios.post(
      'https://api.firecrawl.dev/v1/scrape',
      {
        url,
        formats: ['markdown'],
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }
      }
    );

    console.log('Firecrawl API response:', firecrawlResponse.data);

    if (!firecrawlResponse.data.success) {
      throw new Error(firecrawlResponse.data.error || 'Firecrawl API error');
    }

    // Transform the response into our schema
    const result = {
      source_url: url,
      crawled_at: new Date().toISOString(),
      pages: [{
        url: url,
        title: firecrawlResponse.data.data.metadata?.title || '',
        sections: firecrawlResponse.data.data.markdown
          .split('\n#')
          .map(section => {
            const [heading, ...contentLines] = section.split('\n');
            return {
              heading: heading.trim().replace(/^#+\s*/, ''),
              content: contentLines.join('\n').trim()
            };
          })
          .filter(section => section.heading && section.content)
      }]
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
