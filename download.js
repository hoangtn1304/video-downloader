// download.js
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import CONFIG from './config.js';

const {
  DOWNLOAD_DIR,
  DOWNLOAD_TMP,
  PREVIEW_ONLY,
  COURSE_JSON_PATH,
  CHROME_EXECUTABLE,
  CHROME_PROFILE_DIR,
  PROGRESS_PATH
} = CONFIG;

function sanitize(name) {
  if (!name || typeof name !== 'string') return 'unnamed';
  return name.replace(/[\\/:*?"<>|]/g, '').trim();
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

function updateProgress(progress, section, lectureTitle) {
  if (!progress[section]) progress[section] = [];
  if (!progress[section].includes(lectureTitle)) {
    progress[section].push(lectureTitle);
    saveProgress(progress);
  }
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
  const courseJson = JSON.parse(fs.readFileSync(COURSE_JSON_PATH, 'utf-8'));
  const progress = loadProgress();

  if (!fs.existsSync(DOWNLOAD_TMP)) fs.mkdirSync(DOWNLOAD_TMP, { recursive: true });

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME_EXECUTABLE,
    userDataDir: CHROME_PROFILE_DIR
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
    const sectionTitle = sanitize(section.section);
    const sectionPath = path.join(DOWNLOAD_DIR, sectionTitle);
    if (!fs.existsSync(sectionPath) && !PREVIEW_ONLY) fs.mkdirSync(sectionPath, { recursive: true });

    console.log(`\n📂 Section: "${section.section}"`);

    for (let i = 0; i < section.lectures.length; i++) {
      const lecture = section.lectures[i];
      const cleanTitle = sanitize(lecture.title);
      const lectureTitle = `${i + 1}- ${cleanTitle}.mp4`;
      const lectureUrl = lecture.url;

      if (progress[section.section]?.includes(lectureTitle)) {
        console.log(`⏩ Already downloaded: ${lectureTitle}`);
        continue;
      }

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

        updateProgress(progress, section.section, lectureTitle);

      } catch (err) {
        console.error(`💥 Error in "${lecture.title}": ${err.message}`);
      }
    }
  }

  console.log(PREVIEW_ONLY ? '👁 Preview complete!' : '✅ Download complete!');
  await browser.close();
})();
