require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const { generateNarrative } = require('./utils/aiNarrative');
const { generateDocx } = require('./utils/reportGenerator');

const app = express();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 20 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure uploads dir exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('outputs')) fs.mkdirSync('outputs');

// ─── Health check ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ─── FIDIC clause lookup ─────────────────────────────────────────
app.get('/api/fidic/:edition', (req, res) => {
  try {
    const clauses = require('./data/fidic-clauses.json');
    const edition = clauses[req.params.edition];
    if (!edition) return res.status(404).json({ error: 'Edition not found' });
    res.json(edition);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Upload Excel file — return sheets and columns ───────────────
app.post('/api/upload/excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.readFile(req.file.path);
    const sheets = {};

    workbook.SheetNames.forEach(name => {
      const sheet = workbook.Sheets[name];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (rows.length === 0) return;

      const headers = rows[0].map(h => String(h || '').trim()).filter(Boolean);
      const preview = rows.slice(1, 4).map(row =>
        headers.reduce((obj, h, i) => ({ ...obj, [h]: row[i] ?? '' }), {})
      );

      sheets[name] = { headers, preview, rowCount: rows.length - 1 };
    });

    fs.unlinkSync(req.file.path);
    res.json({ sheets, sheetNames: Object.keys(sheets) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Parse Excel with user column mapping ────────────────────────
app.post('/api/upload/excel/parse', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { sheetName, columnMapping } = req.body;
    const mapping = typeof columnMapping === 'string' ? JSON.parse(columnMapping) : columnMapping;

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return res.status(400).json({ error: 'Sheet not found' });

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const headers = rows[0];
    const dataRows = rows.slice(1);

    const activities = dataRows
      .filter(row => row[mapping.activityName])
      .map((row, i) => {
        const plannedFinish = row[mapping.plannedFinish];
        const actualFinish = row[mapping.actualFinish];
        let delayDays = 0;
        if (plannedFinish && actualFinish) {
          const pf = new Date(plannedFinish), af = new Date(actualFinish);
          delayDays = Math.max(0, Math.round((af - pf) / (1000 * 60 * 60 * 24)));
        }
        return {
          id: `excel-${i}`,
          activityId: row[mapping.activityId] || `A${String(i + 1).padStart(3, '0')}`,
          activityName: String(row[mapping.activityName] || ''),
          plannedStart: row[mapping.plannedStart] || null,
          plannedFinish: plannedFinish || null,
          actualStart: row[mapping.actualStart] || null,
          actualFinish: actualFinish || null,
          delayDays,
          percentComplete: row[mapping.percentComplete] ?? null,
          delayCause: String(row[mapping.delayCause] || ''),
          responsibility: row[mapping.responsibility] || '',
          criticalPath: row[mapping.criticalPath]
            ? ['yes','true','1','y','critical'].includes(String(row[mapping.criticalPath]).toLowerCase())
            : delayDays > 5
        };
      })
      .filter(a => a.activityName && a.delayDays > 0);

    fs.unlinkSync(req.file.path);
    res.json({ activities, total: activities.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Calculate EOT ───────────────────────────────────────────────
app.post('/api/calculate/eot', (req, res) => {
  try {
    const { delayEvents, projectData } = req.body;
    if (!delayEvents?.length) return res.status(400).json({ error: 'No delay events provided' });

    let employerDays = 0, neutralDays = 0, forceDays = 0, contractorDays = 0, concurrentDays = 0;

    const processedEvents = delayEvents.map((event, i) => {
      const resp = event.responsibility || 'unknown';
      const days = Number(event.delayDays) || 0;
      const critical = event.criticalPath !== false;
      const entitled = critical && resp !== 'contractor';

      if (critical) {
        if (resp === 'employer') employerDays += days;
        else if (resp === 'neutral') neutralDays += days;
        else if (resp === 'force_majeure') forceDays += days;
        else if (resp === 'contractor') contractorDays += days;
        else employerDays += days; // unknown — include
      }

      // Simple concurrent check: overlapping date ranges where one is contractor
      let isConcurrent = false;
      if (entitled && event.startDate && event.endDate) {
        delayEvents.forEach((other, j) => {
          if (i !== j && other.responsibility === 'contractor' && other.startDate && other.endDate) {
            const s1 = new Date(event.startDate), e1 = new Date(event.endDate);
            const s2 = new Date(other.startDate), e2 = new Date(other.endDate);
            if (s1 <= e2 && s2 <= e1) {
              isConcurrent = true;
              if (critical) concurrentDays += days;
            }
          }
        });
      }

      return { ...event, delayDays: days, criticalPath: critical, eotEntitlement: entitled, isConcurrent };
    });

    const grossEOT = employerDays + neutralDays + forceDays;
    const netEOT = Math.max(0, grossEOT - concurrentDays);

    // Notice compliance
    let noticeCompliant = null;
    if (projectData.noticeDate && projectData.firstDelayDate) {
      const diff = Math.round((new Date(projectData.noticeDate) - new Date(projectData.firstDelayDate)) / (1000 * 60 * 60 * 24));
      noticeCompliant = diff <= 28;
    }

    res.json({
      summary: { totalEvents: delayEvents.length, employerDays, neutralDays, forceMajeureDays: forceDays, contractorDays, concurrentDays, grossEOT, netEOT },
      noticeCompliance: { compliant: noticeCompliant, requiredDays: 28, noticeIssued: projectData.noticeIssued },
      events: processedEvents
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Generate AI narrative ───────────────────────────────────────
app.post('/api/generate/narrative', async (req, res) => {
  try {
    const { project, calculation, delayEvents, fidic } = req.body;
    const result = await generateNarrative({ project, calculation, delayEvents, fidic });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Generate Word report ────────────────────────────────────────
app.post('/api/report/docx', async (req, res) => {
  try {
    const { project, calculation, delayEvents, fidic, narrative } = req.body;
    const filePath = await generateDocx({ project, calculation, delayEvents, fidic, narrative });

    res.download(filePath, `EOT_Claim_${project.contractNumber || 'Report'}.docx`, () => {
      fs.unlink(filePath, () => {});
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start server ────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`EOT Tool API running on port ${PORT}`));

module.exports = app;
