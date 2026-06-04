# EOT & Delay Analysis Assistant

> **FIDIC-compliant Extension of Time claim preparation tool** — built for infrastructure and construction projects in the KSA market.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-teal?style=flat-square)](https://suleman-muhammad.github.io/eot-delay-assistant/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![FIDIC](https://img.shields.io/badge/FIDIC-All%204%20Editions-blue?style=flat-square)](#fidic-support)

---

## What this tool does

Planning engineers on FIDIC-based projects spend **2–3 days** preparing each Extension of Time submission manually — pulling delay events from Primavera P6, linking them to FIDIC sub-clauses, calculating Time Impact Analysis, and drafting the formal narrative.

This tool reduces that to **under 30 minutes**.

Upload your P6 XER file or Excel progress tracker, enter your delay events with causes and responsibility, and the tool generates a fully structured EOT submission document — Word and PDF — with AI-written FIDIC narrative, sub-clause references, and TIA summary.

---

## Key features

- **All four FIDIC editions** — Yellow Book 1999, Red Book 1999, Yellow Book 2017, Red Book 2017. Clause numbers auto-populate based on your contract edition.
- **Three input modes** — Primavera P6 XER/XML, Excel progress tracker (smart column mapper handles any column names), or manual quick assessment.
- **Smart Excel mapper** — upload any Excel format. Select the sheet, map your columns once, and the tool reads planned vs actual dates regardless of what you named them.
- **EOT calculation engine** — computes delay per activity, identifies critical path impact, detects concurrent delays, and calculates net EOT entitlement.
- **Sub-Clause 20.1 notice compliance checker** — flags whether your notice was issued within the 28-day requirement and warns of risk if not.
- **AI narrative generation** — formal FIDIC claim language generated automatically. Uses Google Gemini (free), Groq (free fallback), or OllamaFreeAPI (community fallback). Template-based generation if all AI sources unavailable.
- **Word (.docx) + PDF export** — professional report format ready for submission to the Engineer.
- **Quick assessment mode** — manual entry for position checks before meetings. Output clearly marked as internal working paper, not for submission.

---

## FIDIC support

| Edition | EOT Clause | Notice Clause | Force Majeure |
|---------|-----------|---------------|---------------|
| Yellow Book 1999 | Sub-Cl. 8.4 | Sub-Cl. 20.1 | Sub-Cl. 19.1 |
| Red Book 1999 | Sub-Cl. 8.4 | Sub-Cl. 20.1 | Sub-Cl. 19.1 |
| Yellow Book 2017 | Sub-Cl. 8.5 | Sub-Cl. 20.2 | Sub-Cl. 18.1 |
| Red Book 2017 | Sub-Cl. 8.5 | Sub-Cl. 20.2 | Sub-Cl. 18.1 |

---

## Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + Vite | Fast builds, GitHub Pages compatible |
| Styling | Tailwind CSS | Utility-first, no custom CSS needed |
| Backend | Node.js + Express | Single language across full stack |
| Excel parsing | SheetJS (xlsx) | Reads any Excel format, any column names |
| P6 parsing | XER file reader | Extracts activities, float, logic from P6 exports |
| AI narrative | Gemini 2.0 Flash → Groq → OllamaFreeAPI | Free tier, 3-layer fallback, never goes down |
| Word export | docx library | Programmatic Word generation, no paid tools |
| Frontend hosting | GitHub Pages | Free, auto-deploys on push |
| Backend hosting | Render.com (free tier) | Auto-deploys from GitHub |

---

## Getting started

### Prerequisites
- Node.js 18+
- A free Gemini API key from [aistudio.google.com](https://aistudio.google.com) (optional — tool works without it using template mode)

### Run locally

```bash
# Clone
git clone https://github.com/suleman-muhammad/eot-delay-assistant.git
cd eot-delay-assistant

# Backend
cd backend
cp .env.example .env
# Add your GEMINI_API_KEY to .env (optional)
npm install
npm start

# Frontend (new terminal)
cd ../frontend
npm install
npm run dev
```

Open `http://localhost:5173` — the tool is running.

### Deploy to GitHub Pages + Render

1. Fork this repo
2. In your repo Settings → Pages → Source: **GitHub Actions**
3. Add a repo secret: `VITE_API_URL` = your Render backend URL
4. On [render.com](https://render.com): New Web Service → connect your repo → it reads `render.yaml` automatically
5. Add `GEMINI_API_KEY` and `GROQ_API_KEY` as environment variables in Render
6. Push to main — GitHub Actions deploys the frontend, Render deploys the backend

---

## How to use

**Step 1 — Choose input mode**
Select P6 XER file, Excel tracker, or manual entry depending on what schedule data you have.

**Step 2 — Project setup**
Enter contract details, FIDIC edition, original completion date, revised completion date, and notice reference. The tool auto-selects the correct sub-clause numbers.

**Step 3 — Upload schedule data** *(P6 / Excel modes)*
Drop your file. For Excel: select the sheet containing your schedule, then map your column headers to the required fields. The tool guesses matches automatically — you confirm.

**Step 4 — Delay event register**
Enter each delay cause with: description, number of days, responsibility (Employer / Third party / Force majeure / Contractor), and whether it was on the critical path. FIDIC clause is auto-suggested.

**Step 5 — Calculate**
The tool computes EOT entitlement, identifies concurrent delays, checks notice compliance, and shows TIA breakdown with metrics.

**Step 6 — Generate & download**
AI writes the formal FIDIC narrative. Download as Word (.docx) or PDF.

---

## EOT calculation methodology

The tool follows the Time Impact Analysis (TIA) approach accepted by Engineers on FIDIC-based contracts:

1. **Delay classification** — each event is classified: Employer, Neutral/Third Party, Force Majeure, or Contractor
2. **Critical path check** — only delays affecting the critical path (float ≤ 0) attract EOT entitlement
3. **Concurrent delay detection** — where Employer-caused delay overlaps with Contractor-caused delay, concurrent days are deducted from the net claim
4. **Net EOT** = Employer days + Neutral days + Force Majeure days − Concurrent days

---

## About the author

**Muhammad Suleman** — Planning Engineer with experience across infrastructure, utilities, and renewable energy projects in Saudi Arabia and UAE. Registered with the Saudi Council of Engineers (SCE ID: 1193763).

Built this tool to demonstrate practical application of Primavera P6 scheduling, FIDIC contract knowledge, and modern web development skills.

- LinkedIn: [linkedin.com/in/suleman-muhammad](https://linkedin.com/in/suleman-muhammad)
- Credly: [credly.com/users/suleman.muhammad](https://credly.com/users/suleman.muhammad)

---

## Certifications applied in this project

| Certification | Issuer | Applied in tool |
|--------------|--------|-----------------|
| Fortinet Certified Associate Cybersecurity | Fortinet | Secure API key handling, .env practices |
| MITRE ATT&CK Foundations | AttackIQ | Input validation, injection prevention |
| Primavera P6 Professional Project Management | Oracle | XER parsing logic, CPM methodology |
| PMI Essentials M.O.R.E. | PMI | Project planning approach |
| Practical Application of Gen AI for Project Managers | PMI | AI narrative generation integration |
| Compliance & Risk Management | ManageEngine | Data handling and output disclaimers |
| Six Sigma Yellow Belt | CSSC | Calculation quality and error handling |

---

## License

MIT — free to use, modify, and distribute.

---

*Built for FIDIC Yellow Book / Red Book projects. Particularly suited for Vision 2030 infrastructure programs in KSA where FIDIC is the standard contract form.*
