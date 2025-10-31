const axios = require('axios');
const cheerio = require('cheerio');

const KOZI_BASE_URL = 'https://www.kozi.rw';
// Homepage is prioritized and scraped first for better context
const KOZI_PAGES = [
  '/', // Homepage - scraped carefully with enhanced extraction
  '/about',
  '/how-to-apply',
  '/privacy',
  '/terms-of-service',
  '/workers-life',
  '/Job-board',
  '/contact',
  '/Business',
  '/Resedential-Job',
  '/worker',
];

function extractStructuredContent($) {
  const sections = [];

  $('body').find('*').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();

    const statMatch = text.match(/^(\d+)\+?\s*$/);
    if (statMatch && text.length < 10) {
      const label =
        $el.next().text().trim() ||
        $el.parent().text().replace(text, '').trim() ||
        $el.siblings().first().text().trim();

      if (label && label.length > 2 && label.length < 50) {
        sections.push({
          type: 'stat',
          content: `${text} ${label}`,
        });
      }
    }
  });

  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const $heading = $(el);
    const headingText = $heading.text().trim();

    if (!headingText || headingText.length < 3) return;

    let content = '';
    let $next = $heading.next();

    while ($next.length && !$next.is('h1, h2, h3, h4, h5, h6')) {
      const text = $next.text().trim();
      if (text) content += text + '\n';
      $next = $next.next();
    }

    if (content.trim()) {
      sections.push({
        heading: headingText,
        content: content.trim(),
        type: 'text',
      });
    }
  });

  $('ol').each((_, el) => {
    const $list = $(el);
    const items = [];

    $list.find('li').each((idx, li) => {
      const text = $(li).text().trim();
      if (text) {
        items.push(`Step ${idx + 1}: ${text}`);
      }
    });

    if (items.length > 0) {
      const $prev = $list.prevAll('h1, h2, h3, h4, h5, h6').first();
      const heading = $prev.length ? $prev.text().trim() : undefined;

      sections.push({
        heading,
        content: items.join('\n'),
        type: 'steps',
      });
    }
  });

  $('ul').each((_, el) => {
    const $list = $(el);
    const items = [];

    $list.find('li').each((_, li) => {
      const text = $(li).text().trim();
      if (text && text.length > 5) {
        items.push(`• ${text}`);
      }
    });

    if (items.length > 1 && items.length < 20) {
      const $prev = $list.prevAll('h1, h2, h3, h4, h5, h6').first();
      const heading = $prev.length ? $prev.text().trim() : undefined;

      sections.push({
        heading,
        content: items.join('\n'),
        type: 'list',
      });
    }
  });

  $('[class*="accordion"], [class*="collapse"], [class*="dropdown"], details').each((_, el) => {
    const $el = $(el);
    const heading = $el.find('summary, [class*="header"], [class*="title"]').first().text().trim();
    const content =
      $el.find('[class*="content"], [class*="body"]').text().trim() ||
      $el.text().replace(heading, '').trim();

    if (heading && content && content.length > 20) {
      sections.push({
        heading,
        content,
        type: 'text',
      });
    }
  });

  $('section, [class*="section"], [class*="content-block"]').each((_, el) => {
    const $section = $(el);

    if ($section.find('h1, h2, h3').length > 2) return;

    const heading = $section.find('h1, h2, h3, h4, h5, h6').first().text().trim();
    const content = $section.text().replace(heading, '').trim();

    if (content && content.length > 50 && content.length < 2000) {
      sections.push({
        heading,
        content,
        type: 'text',
      });
    }
  });

  return sections;
}

function formatSections(sections) {
  const formatted = [];
  const seen = new Set();

  const stats = sections.filter((s) => s.type === 'stat');
  if (stats.length > 0) {
    const statsText = stats.map((s) => s.content).join('\n');
    if (!seen.has(statsText.substring(0, 50))) {
      formatted.push('**KOZI STATISTICS:**\n' + statsText);
      seen.add(statsText.substring(0, 50));
    }
  }

  sections
    .filter((s) => s.type !== 'stat')
    .forEach((section) => {
      const key = (section.heading || '') + section.content.substring(0, 50);

      if (seen.has(key)) return;
      seen.add(key);

      let formattedSection = '';

      if (section.heading) {
        formattedSection += `**${section.heading}**\n`;
      }

      formattedSection += section.content;

      if (section.type === 'steps') {
        formattedSection = `[PROCESS/STEPS]\n${formattedSection}`;
      } else if (section.type === 'list') {
        formattedSection = `[LIST]\n${formattedSection}`;
      }

      formatted.push(formattedSection);
    });

  return formatted.join('\n\n');
}

async function scrapePage(path) {
  try {
    const url = `${KOZI_BASE_URL}${path}`;
    const isHomepage = path === '/';
    console.log(`\n🔍 Scraping: ${url}${isHomepage ? ' [HOMEPAGE - Enhanced Extraction]' : ''}`);

    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const $ = cheerio.load(data);

    // Remove unwanted elements
    $('script, style, nav, header, footer, .navbar, .menu, noscript, iframe, svg, .ad, .advertisement').remove();

    // For homepage, extract additional important sections
    let homepageExtraContent = '';
    if (isHomepage) {
      // Extract meta description for context
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      
      // Extract main hero/headline content
      const heroContent = [];
      $('h1, [class*="hero"], [class*="headline"], [class*="banner"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 10 && text.length < 200) {
          const nextText = $(el).next().text().trim().substring(0, 300);
          if (nextText) {
            heroContent.push(`**${text}**\n${nextText}`);
          }
        }
      });

      // Extract popular categories/services section
      const categories = [];
      $('[class*="category"], [class*="service"], [class*="popular"]').each((_, el) => {
        const $cat = $(el);
        const title = $cat.find('h2, h3, h4, [class*="title"]').first().text().trim();
        const desc = $cat.text().replace(title, '').trim().substring(0, 200);
        if (title && desc && title.length < 100) {
          categories.push(`**${title}**\n${desc}`);
        }
      });

      // Extract testimonials/reviews
      const testimonials = [];
      $('[class*="testimonial"], [class*="review"], [class*="quote"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 50 && text.length < 500) {
          testimonials.push(`"${text}"`);
        }
      });

      // Combine homepage-specific content
      if (metaDescription || heroContent.length > 0 || categories.length > 0 || testimonials.length > 0) {
        if (metaDescription) {
          homepageExtraContent += `**Platform Overview:** ${metaDescription}\n\n`;
        }
        
        if (heroContent.length > 0) {
          homepageExtraContent += `**Main Headlines:**\n${heroContent.slice(0, 3).join('\n\n')}\n\n`;
        }
        
        if (categories.length > 0) {
          homepageExtraContent += `**Popular Services & Categories:**\n${categories.slice(0, 10).join('\n\n')}\n\n`;
        }
        
        if (testimonials.length > 0) {
          homepageExtraContent += `**What Our Community Says:**\n${testimonials.slice(0, 5).join('\n\n')}\n\n`;
        }

        if (homepageExtraContent.trim()) {
          console.log('   ✅ Extracted homepage-specific content (hero, categories, testimonials)');
        }
      }
    }

    const sections = extractStructuredContent($);
    const formattedContent = formatSections(sections);

    let finalContent = formattedContent;

    // For homepage, allow more content and better fallback
    if (isHomepage) {
      if (formattedContent.length < 500) {
        console.log('   ⚠️  Structured extraction yielded little content, using enhanced fallback for homepage');
        // Enhanced fallback: extract main content areas
        const mainContent = [];
        
        // Get all major headings and their content
        $('h1, h2, h3').each((_, el) => {
          const $heading = $(el);
          const headingText = $heading.text().trim();
          let content = '';
          
          // Get next sibling elements until next heading
          let $next = $heading.next();
          let count = 0;
          while ($next.length && count < 10 && !$next.is('h1, h2, h3')) {
            const text = $next.text().trim();
            if (text && text.length > 20) {
              content += text + ' ';
            }
            $next = $next.next();
            count++;
          }
          
          if (headingText && content && headingText.length < 150 && content.length > 30) {
            mainContent.push(`**${headingText}**\n${content.substring(0, 400).trim()}`);
          }
        });

        if (mainContent.length > 0) {
          finalContent = mainContent.join('\n\n');
        } else {
          const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
          finalContent = bodyText.substring(0, 8000); // More content for homepage
        }
      } else if (formattedContent.length < 3000) {
        // If we have some content but not much, try to get more
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
        const additionalContent = bodyText.substring(formattedContent.length, formattedContent.length + 5000);
        if (additionalContent.length > 500) {
          finalContent += '\n\n' + additionalContent;
          console.log('   ✅ Enhanced homepage content with additional extracted text');
        }
      }

      // Prepend homepage extra content
      if (homepageExtraContent) {
        finalContent = homepageExtraContent + finalContent;
      }
    } else {
      if (formattedContent.length < 100) {
        console.log('   ⚠️  Structured extraction yielded little content, using fallback');
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
        finalContent = bodyText.substring(0, 5000);
      }
    }

    const hasStats = /\d+\+?\s*(companies|individuals|jobseeker|workers|clients)/i.test(finalContent);
    const hasSteps = /step \d+:/i.test(finalContent.toLowerCase()) || /\d+\.\s+/gm.test(finalContent);
    const hasLists = (finalContent.match(/^•/gm) || []).length > 2;

    console.log('   📊 Analysis:');
    console.log(`      - Length: ${finalContent.length} chars`);
    console.log(`      - Sections extracted: ${sections.length}`);
    console.log(`      - Has stats: ${hasStats}`);
    console.log(`      - Has steps/process: ${hasSteps}`);
    console.log(`      - Has lists: ${hasLists}`);

    if (isHomepage) {
      console.log('   📄 HOMEPAGE DETAILED SAMPLE:\n');
      console.log(`   ${finalContent.substring(0, 1200)}\n   ...`);
    } else if (['/how-to-apply', '/about'].includes(path)) {
      console.log('   📄 DETAILED SAMPLE:\n');
      console.log(`   ${finalContent.substring(0, 800)}\n   ...`);
    }

    return `### Page: ${path}\n\n${finalContent}`;
  } catch (err) {
    console.error(`   ❌ Error scraping ${path}:`, err.message);
    return `### Page: ${path}\n(Scraping failed: ${err.message})`;
  }
}

function chunkText(text, maxChars = 2500) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + maxChars));
    start += maxChars;
  }
  return chunks;
}

async function fetchKoziWebsiteContext() {
  console.log('\n' + '='.repeat(70));
  console.log('🌐 KOZI WEBSITE CONTEXT FETCH - STRUCTURED EXTRACTION');
  console.log('='.repeat(70));
  console.log('📌 HOMEPAGE (/) is prioritized and scraped with enhanced extraction');

  const results = await Promise.all(KOZI_PAGES.map((path) => scrapePage(path)));

  const combined = results.join('\n\n' + '='.repeat(60) + '\n\n');
  const chunks = chunkText(combined);

  const statsCount = (combined.match(/\d+\+?\s*(companies|individuals|jobseeker|workers|clients)/gi) || []).length;
  const stepsCount = (combined.match(/step \d+:/gi) || []).length;
  const sectionsCount = (combined.match(/### Page:/g) || []).length;

  console.log('\n' + '='.repeat(70));
  console.log('✅ FETCH COMPLETE');
  console.log(`   📄 Pages scraped: ${results.length}`);
  console.log(`   📦 Chunks created: ${chunks.length}`);
  console.log(`   📏 Total length: ${combined.length} chars`);
  console.log(`   📊 Stats found: ${statsCount}`);
  console.log(`   🔢 Process steps found: ${stepsCount}`);
  console.log(`   📑 Sections: ${sectionsCount}`);
  console.log('='.repeat(70) + '\n');

  return combined;
}

module.exports = { fetchKoziWebsiteContext };
