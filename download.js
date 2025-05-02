import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import os from 'os';

const DOWNLOAD_ROOT = path.resolve('./downloads');
const TEMP_ROOT = path.join(DOWNLOAD_ROOT, 'tmp');
const PREVIEW_ONLY = false; // Toggle to true to preview only

const courseJson = JSON.parse(fs.readFileSync('./course.json', 'utf-8'));

function sanitize(name) {
  if (!name || typeof name !== 'string') return 'unnamed';
  return name.replace(/[\\/:*?"<>|]/g, '').trim();
}

function getMostRecentFile(dir) {
  const files = fs.readdirSync(dir)
    .map(name => ({ name, time: fs.statSync(path.join(dir, name)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);
  return files.length ? path.join(dir, files[0].name) : null;
}

(async () => {
  if (!fs.existsSync(DOWNLOAD_ROOT)) fs.mkdirSync(DOWNLOAD_ROOT);
  if (!fs.existsSync(TEMP_ROOT)) fs.mkdirSync(TEMP_ROOT);

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    userDataDir: './chrome-user-data'
  });

  const page = await browser.newPage();

  for (const section of courseJson) {
    const sectionPath = path.join(DOWNLOAD_ROOT, sanitize(section.section));
    if (!fs.existsSync(sectionPath) && !PREVIEW_ONLY)
      fs.mkdirSync(sectionPath, { recursive: true });

    console.log(`\n📂 Section: "${section.section}"`);

    for (let i = 0; i < section.lectures.length; i++) {
      const lecture = section.lectures[i];
      const lectureTitle = `${i + 1}- ${sanitize(lecture.title)}.mp4`;
      const lectureUrl = lecture.url;
      const tempDownloadDir = path.join(TEMP_ROOT, `lecture-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);

      fs.mkdirSync(tempDownloadDir, { recursive: true });

      try {
        console.log(`🔍 Navigating to: ${lectureUrl}`);
        await page._client().send('Page.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath: tempDownloadDir
        });

        await page.goto(lectureUrl, { waitUntil: 'networkidle2' });

        if (PREVIEW_ONLY) {
          const videoUrl = await page.$eval('a.download', el => el.href);
          console.log(`✅ VIDEO LINK: ${lectureTitle} → ${videoUrl}`);
        } else {
          console.log(`⬇ Downloading: ${lectureTitle}`);
          await page.click('a.download');
          await new Promise(res => setTimeout(res, 10000));

          const downloadedFile = getMostRecentFile(tempDownloadDir);
          if (downloadedFile) {
            const destPath = path.join(sectionPath, lectureTitle);
            fs.renameSync(downloadedFile, destPath);
            console.log(`📁 Moved to: ${destPath}`);
          } else {
            console.warn(`⚠️ No file found in temp dir: ${tempDownloadDir}`);
          }
        }

      } catch (err) {
        console.error(`💥 Error in "${lecture.title}": ${err.message}`);
      } finally {
        // Cleanup temp folder
        if (!PREVIEW_ONLY && fs.existsSync(tempDownloadDir)) {
          fs.rmSync(tempDownloadDir, { recursive: true, force: true });
        }
      }
    }
  }

  console.log(PREVIEW_ONLY ? '👁 Preview complete!' : '✅ Download complete!');
  await browser.close();
})();
