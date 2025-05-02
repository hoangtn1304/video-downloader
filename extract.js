import puppeteer from 'puppeteer';
import fs from 'fs-extra';

const COURSE_URL = 'https://members.codewithmosh.com/courses/spring-boot-mastering-fundamentals/lectures/60162299'; // <-- Replace this

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();
await page.goto(COURSE_URL, { waitUntil: 'networkidle2' });

await page.waitForSelector('div.course-section');

const data = await page.evaluate(() => {
  const prefix = 'https://members.codewithmosh.com';
  const sections = [];

  document.querySelectorAll('div.course-section').forEach(section => {
    const title = section.querySelector('.section-title')?.innerText?.trim() || 'Untitled';
    const lectures = [...section.querySelectorAll('ul.section-list li[data-lecture-url]')].map(li => ({
      title: li.innerText.trim().replace(/\s{2,}/g, ' '),
      url: prefix + li.getAttribute('data-lecture-url')
    }));

    if (lectures.length > 0) {
      sections.push({ section: title, lectures });
    }
  });

  return sections;
});

await fs.writeJson('course.json', data, { spaces: 2 });
console.log('✅ Extracted to course.json');
await browser.close();