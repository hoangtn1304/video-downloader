import path from 'path';

const CONFIG = {
  COURSE_URL: 'https://members.codewithmosh.com/courses/ultimate-c-plus-plus-part2-1/lectures/42231829',
  COURSE_JSON_PATH: path.resolve('./course.json'),
  DOWNLOAD_DIR: path.resolve('./downloads'),
  DOWNLOAD_TMP: path.resolve('./downloads/__tmp'),
  PROGRESS_PATH: path.resolve('./progress.json'),
  PREVIEW_ONLY: false,
  CHROME_EXECUTABLE: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  CHROME_PROFILE_DIR: './chrome-user-data'
};

export default CONFIG;