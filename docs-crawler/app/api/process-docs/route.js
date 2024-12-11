import axios from 'axios';
import cheerio from 'cheerio';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { url } = await request.json();
    console.log('\n=== Starting crawler for URL:', url, '===\n');

    // Step 1: Get initial page content
    console.log('Fetching initial page...');
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    console.log('Initial page fetched successfully');

    // Get all links from the page
    console.log('\nCollecting links...');
    const links = new Set();
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      if (href && !href.startsWith('#')) {
        try {
          const absoluteUrl = new URL(href, url).toString();
          if (absoluteUrl.startsWith(new URL(url).origin)) {
            links.add(absoluteUrl);
            console.log('Added link:', absoluteUrl);
          }
        } catch (error) {
          console.log(`Skipped invalid URL ${href}:`, error.message);
        }
      }
    });

    // Step 2: Crawl each URL and collect content
    const pages = [];
    const processedUrls = new Set();
    console.log('\nStarting to crawl pages...');
    console.log('Total links to process:', links.size);

    for (const pageUrl of links) {
      if (processedUrls.has(pageUrl)) {
        console.log('Skipping already processed URL:', pageUrl);
        continue;
      }
      processedUrls.add(pageUrl);

      console.log('\nProcessing URL:', pageUrl);
      try {
        const pageResponse = await axios.get(pageUrl);
        const page$ = cheerio.load(pageResponse.data);
        console.log('Page fetched successfully');

        // Extract code examples
        console.log('Extracting code examples...');
        const codeExamples = [];
        page$('pre code').each((_, element) => {
          const code = page$(element).text().trim();
          if (code) {
            codeExamples.push(code);
          }
        });
        console.log('Found', codeExamples.length, 'code examples');

        // Extract links
        console.log('Extracting links...');
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
              console.log(`Skipped invalid URL ${href}:`, error.message);
            }
          }
        });
        console.log('Found', pageLinks.length, 'links');

        // Extract sections with headings and content
        console.log('Extracting sections...');
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
        console.log('Found', sections.length, 'sections');

        // Get page title
        const title = page$('title').text().trim() ||
                     page$('h1').first().text().trim() ||
                     new URL(pageUrl).pathname;
        console.log('Page title:', title);

        pages.push({
          url: pageUrl,
          title,
          code_examples: codeExamples,
          links: pageLinks,
          sections
        });

        console.log('Successfully processed page:', pageUrl);
      } catch (error) {
        console.error('Error processing URL:', pageUrl, error.message);
      }
    }

    const result = {
      source_url: url,
      crawled_at: new Date().toISOString(),
      pages
    };

    console.log('\n=== Crawler finished ===');
    console.log('Total pages processed:', pages.length);
    console.log('Timestamp:', result.crawled_at);

    return NextResponse.json(result);

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
