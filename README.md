# 🦫 Scouting Beavie — AI Job Fit Scout for Chrome

**Scouting Beavie** is a privacy-first Chrome extension that acts as your personal AI job-hunting companion. Instead of spending hours reading lengthy job descriptions to figure out if you qualify, Beavie compares any job opening against your resume in a single click—giving you an instant match score, strengths, missing requirements, and resume-tailoring advice.

No account, login, or sign-up required!

---

## ✨ What It Does

1. **Upload Your Resume Once**
   Drop your PDF resume into the Scouting Beavie popup. Your resume text is extracted and saved **locally inside your browser** so you never have to re-upload it unless you want to switch resumes.

2. **Automatic Job Detection on Indeed**
   Whenever you open a job listing on **Indeed**, Beavie appears in the top-right corner of the page. As you click between different job cards, Beavie automatically updates and resets for the job you are currently viewing.

3. **One-Click AI Profile Match**
   Click **"Check if this job is a good fit"** and Beavie will analyze the job header, summary, and full description against your resume.

4. **Playful Visual Verdicts & Actionable Advice**
   Once the analysis finishes, Beavie reacts with a custom animation, displays your **Match Score (`%`)** on his badge, and gives one of three clear recommendations:
   - 🟢 **Apply Now** — Your skills and experience strongly align with the role.
   - 🟡 **Apply with Tailoring** — You have a solid foundation, and Beavie tells you exactly which projects or skills to emphasize before applying.
   - 🔴 **Skip Job** — The role has core requirements (such as years of experience, tech stack, or location) that don't match your profile.

5. **Collapsible Full Match Report**
   Click **"Show details ▼"** on the button to expand a clean breakdown containing:
   - **Match Score & Verdict** (e.g., `70% FIT`)
   - **Beavie's Advice** — Actionable tips on how to tailor your resume for this specific opening.
   - **✓ Profile Matches** — Skills, experience, and education from your resume that match the job.
   - **⚠ Missing / Gaps** — Missing requirements clearly tagged as **`REQUIRED`** or **`PREFERRED`** so you know whether a gap is a dealbreaker or just a nice-to-have.

---

## 🚀 How to Use Scouting Beavie

### Step 1: Save Your Resume
1. Click the **Scouting Beavie** icon in your Chrome toolbar to open the popup.
2. Click **Select Resume (.pdf)** and choose your resume file *(text-based PDF, up to 2 pages and under 5 MB)*.
3. Click **Save Resume to Beavie**.
4. Once saved, the popup will display your stored filename (`✓ Resume Stored Locally`). You can replace it anytime by clicking **Upload a new resume**.

### Step 2: Scout Jobs on Indeed
1. Visit [Indeed](https://in.indeed.com) and click on any job opening.
2. Look for the floating **Beavie widget** in the top-right corner of the page.
3. Click **"Check if this job is a good fit"**.
4. Wait a few seconds while Beavie scans the listing.
5. Click **"Show details ▼"** to read your full match breakdown, or click **"Hide details ▲"** (or the top-right **`✕`** button) when you're done.

---

## 🔒 Privacy First

We take your privacy seriously:
- **No Sign-Up Required:** You never have to provide your name, email address, or create an account.
- **Stored Locally in Your Browser:** Your parsed resume text and filename are stored strictly inside your own browser (`chrome.storage.local`).
- **No Resume Database:** Your PDF resume is never saved or stored on any external server or database. It is only processed in memory to extract text and compute your job fit score.

---

## 📌 Good to Know (Limits & Requirements)

- **Resume Format:** Please use a **text-based PDF** (up to **2 pages** and under **5 MB**). Scanned image-only PDFs are not supported.
- **Fair-Use Daily Quota:** Because Scouting Beavie uses AI to analyze each job description in depth, there is a free daily usage limit per user. If you hit your daily limit, Beavie will let you know to come back tomorrow when your quota resets!
- **Supported Job Portals:** Currently available on **Indeed (`in.indeed.com`)**. We are actively working on onboarding additional job portals soon!

---

## 🛠️ Installing Locally (Unpacked Extension)

If you are installing Scouting Beavie from source:

1. Clone this repository and install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root with the API endpoints:
   ```env
   VITE_PARSE_PDF_URL=<your-parse-pdf-endpoint>
   VITE_MATCH_JOB_URL=<your-match-job-profile-endpoint>
   ```
3. Build the extension bundle:
   ```bash
   npm run build
   ```
4. Open Chrome and navigate to `chrome://extensions`.
5. Enable **Developer mode** (toggle in the top-right corner).
6. Click **Load unpacked** and select this project folder.
