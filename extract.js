import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import CONFIG from './config.js';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log(`🔍 Navigating to course URL: ${CONFIG.COURSE_URL}`);
  await page.goto(CONFIG.COURSE_URL, { waitUntil: 'networkidle2' });
  await page.waitForSelector('div.course-section');

  const sections = await page.evaluate(() => {
    const base = 'https://members.codewithmosh.com';
    const results = [];

    document.querySelectorAll('div.course-section').forEach(section => {
      const sectionTitle = section.querySelector('.section-title')?.innerText?.trim() || 'Untitled';

      const lectures = Array.from(section.querySelectorAll('ul.section-list li[data-lecture-url]'))
        .map(li => {
          const title = li.innerText.trim().replace(/\s{2,}/g, ' ');
          const url = li.getAttribute('data-lecture-url');
          return { title, url: base + url };
        });

      if (lectures.length > 0) {
        results.push({ section: sectionTitle, lectures });
      }
    });

    return results;
  });

  await fs.writeJson(CONFIG.COURSE_JSON_PATH, sections, { spaces: 2 });
  console.log(`✅ Course data saved to ${CONFIG.COURSE_JSON_PATH}`);

  await browser.close();
})();