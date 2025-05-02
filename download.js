import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import os from 'os';

const DOWNLOAD_ROOT = path.resolve('./downloads');
const DOWNLOAD_TMP = path.join(DOWNLOAD_ROOT, '__tmp');
const PREVIEW_ONLY = false; // Toggle to true to test without downloading
const courseJson = JSON.parse(fs.readFileSync('./course.json', 'utf-8'));

function sanitize(name) {
  if (!name || typeof name !== 'string') return 'unnamed';
  return name.replace(/[\\/:*?"<>|]/g, '').trim();
}

async function waitForDownload(dir, beforeFiles, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const afterFiles = fs.readdirSync(dir);
    const diff = afterFiles.filter(f => !beforeFiles.includes(f));
    const completed = diff.find(f => f.endsWith('.mp4') && !f.endsWith('.crdownload'));
    if (completed) return completed;
    await new Promise(res => setTimeout(res, 1000));
  }
  throw new Error('Timed out waiting for download to complete');
}

(async () => {
  if (!fs.existsSync(DOWNLOAD_TMP)) fs.mkdirSync(DOWNLOAD_TMP, { recursive: true });

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    userDataDir: './chrome-user-data'
  });

  const page = await browser.newPage();
  if (!PREVIEW_ONLY) {
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: DOWNLOAD_TMP,
    });
  }

  for (const section of courseJson) {
    const sectionPath = path.join(DOWNLOAD_ROOT, sanitize(section.section));
    if (!fs.existsSync(sectionPath) && !PREVIEW_ONLY)
      fs.mkdirSync(sectionPath, { recursive: true });

    console.log(`\n📂 Section: "${section.section}"`);

    for (let i = 0; i < section.lectures.length; i++) {
      const lecture = section.lectures[i];
      const cleanTitle = sanitize(lecture.title);
      const lectureTitle = `${i + 1}- ${cleanTitle}.mp4`;
      const lectureUrl = lecture.url;

      try {
        console.log(`🔍 Navigating to: ${lectureUrl}`);
        await page.goto(lectureUrl, { waitUntil: 'networkidle2' });

        if (PREVIEW_ONLY) {
          const videoLink = await page.$eval('a.download', el => el.href);
          console.log(`✅ Preview: ${lectureTitle} → ${videoLink}`);
          continue;
        }

        const before = fs.readdirSync(DOWNLOAD_TMP);
        console.log(`⬇ Downloading: ${lectureTitle}`);
        await page.click('a.download');

        const newFile = await waitForDownload(DOWNLOAD_TMP, before);
        const oldPath = path.join(DOWNLOAD_TMP, newFile);
        const newPath = path.join(sectionPath, lectureTitle);
        fs.renameSync(oldPath, newPath);
        console.log(`✅ Renamed to: ${lectureTitle}`);

      } catch (err) {
        console.error(`💥 Error in "${lecture.title}": ${err.message}`);
      }
    }
  }

  console.log(PREVIEW_ONLY ? '👁 Preview complete!' : '✅ Download complete!');
  await browser.close();
})();
