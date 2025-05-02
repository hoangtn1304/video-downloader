# Video Downloader

This tool allows you to automatically download lecture videos from internet using Puppeteer and Chrome.

## ✅ Features

- ✔ Organizes videos into section folders
- ✔ Renames each video to match lecture titles
- ✔ Supports login persistence with `userDataDir`
- ✔ Preview-only mode (no downloading) for safe dry runs
- ✔ Retry logic for robustness
- ✔ Auto-generates download summary logs (`.log`, `.txt`, `.json`)
- ✔ Atomic renaming: download → rename → move to folder
- ✔ Visual progress with ✅/💥/⏩ indicators

---

## Prerequisites

- Node.js (v18+ recommended)
- Chrome installed (macOS path default: `/Applications/Google Chrome.app`)
- Puppeteer Core

```bash
npm install
```

---

## Usage

### Step 1: Extract Course Data
Manually (or using your own script) create a `course.json` file in this format:

```json
[
  {
    "section": "Introduction",
    "lectures": [
      {
        "title": "1- Welcome",
        "url": "https://members.codewithmosh.com/lectures/123456"
      }
    ]
  }
]
```

### Step 2: Run the Downloader

```bash
npm run download
```

Optional: toggle preview/download in `download.js`:

```js
const PREVIEW_ONLY = true; // → false to enable downloads
```

---

## Output Folder Structure

```
downloads/
  Section A/
    1- Lecture One.mp4
    2- Lecture Two.mp4
  Section B/
    ...
```

---

## Logs

- `downloaded.log`: names + paths of successfully downloaded videos
- `skipped.log`: lectures skipped due to errors
- `errors.log`: stack traces for debugging

---

## Notes

- Ensure you are logged into course first using Chrome (session is persisted).
- Supports retries and delays for reliable downloading.
- Video files are renamed and moved post-download for clarity.

---

## License

MIT

---

## Author

Built with ❤️ by Hoàng Trần