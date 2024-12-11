import axios from 'axios';
import cheerio from 'cheerio';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { url } = await request.json();
    const apiKey = process.env.FIRECRAWL_API_KEY;

    console.log('Processing URL:', url);

    // Step 1: Get initial page content
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Get all links from the page
    const links = new Set();
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      if (href && !href.startsWith('#')) {
        try {
          const absoluteUrl = new URL(href, url).toString();
          if (absoluteUrl.startsWith(new URL(url).origin)) {
            links.add(absoluteUrl);
          }
        } catch (error) {
          console.log(`Invalid URL ${href}: skipped`);
        }
      }
    });

    // Step 2: Crawl each URL and collect content
    const pages = [];
    const processedUrls = new Set();

    for (const pageUrl of links) {
      if (processedUrls.has(pageUrl)) continue;
      processedUrls.add(pageUrl);

      console.log('Crawling URL:', pageUrl);
      try {
        const pageResponse = await axios.get(pageUrl);
        const page$ = cheerio.load(pageResponse.data);

        // Extract code examples
        const codeExamples = [];
        page$('pre code').each((_, element) => {
          const code = page$(element).text().trim();
          if (code) {
            codeExamples.push(code);
          }
        });

        // Extract links
        const pageLinks = [];
        page$('a').each((_, element) => {
          const href = page$(element).attr('href');
          if (href && !href.startsWith('#')) {
            try {
              const absoluteUrl = new URL(href, pageUrl).toString();
              if (absoluteUrl.startsWith(new URL(url).origin)) {
                pageLinks.push(absoluteUrl);
              }
            } catch (error) {
              console.log(`Invalid URL ${href}: skipped`);
            }
          }
        });

        // Extract sections with headings and content
        const sections = [];
        let currentHeading = null;
        let currentContent = [];

        page$('h1, h2, h3, h4, h5, h6, p').each((_, element) => {
          const $el = page$(element);
          const tagName = $el.prop('tagName').toLowerCase();

          if (tagName.match(/^h[1-6]$/)) {
            // If we have a previous heading and content, save it
            if (currentHeading && currentContent.length > 0) {
              sections.push({
                heading: currentHeading,
                content: currentContent.join('\n\n')
              });
            }
            // Start new section
            currentHeading = $el.text().trim();
            currentContent = [];
          } else if (tagName === 'p') {
            currentContent.push($el.text().trim());
          }
        });

        // Add the last section if exists
        if (currentHeading && currentContent.length > 0) {
          sections.push({
            heading: currentHeading,
            content: currentContent.join('\n\n')
          });
        }

        // Get page title
        const title = page$('title').text().trim() ||
                     page$('h1').first().text().trim() ||
                     new URL(pageUrl).pathname;

        pages.push({
          url: pageUrl,
          title,
          code_examples: codeExamples,
          links: pageLinks,
          sections
        });

      } catch (error) {
        console.error('Error crawling URL:', pageUrl, error);
      }
    }

    const result = {
      source_url: url,
      crawled_at: new Date().toISOString(),
      pages
    };

    console.log('Final result:', JSON.stringify(result, null, 2));

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
