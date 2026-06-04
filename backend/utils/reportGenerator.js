const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

/**
 * Generate a Word .docx EOT report from structured data + narrative
 */
async function generateDocx({ project, calculation, delayEvents, fidic, narrative }) {
  const isQuick = project.isQuickAssessment;
  const templatePath = path.join(__dirname, '../templates', isQuick ? 'eot-quick.docx' : 'eot-formal.docx');

  // Read template — fall back to generating without template if not found
  let content;
  try {
    content = fs.readFileSync(templatePath, 'binary');
  } catch {
    // Template not found — create a simple structured text document
    return generateSimpleDocx({ project, calculation, delayEvents, fidic, narrative });
  }

  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  const entitledEvents = delayEvents.filter(e => e.eotEntitlement !== false);

  doc.render({
    projectName: project.projectName || '',
    contractNumber: project.contractNumber || '',
    contractorName: project.contractorName || '',
    employerName: project.employerName || '',
    engineerName: project.engineerName || 'The Engineer',
    fidic: fidic?.name || 'FIDIC Yellow Book 1999',
    eotClause: fidic?.eotClause || '8.4',
    noticeClause: fidic?.noticeClause || '20.1',
    plannedCompletion: project.plannedCompletion || '',
    forecastCompletion: project.forecastCompletion || '',
    submissionDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    netEOT: calculation.netEOT,
    grossEOT: calculation.grossEOT,
    employerDays: calculation.employerDays,
    neutralDays: calculation.neutralDays,
    concurrentDays: calculation.concurrentDays,
    totalEvents: calculation.totalEvents,
    noticeReference: project.noticeReference || '',
    narrative: narrative || '',
    isQuickAssessment: isQuick,
    delayEvents: entitledEvents.map((e, i) => ({
      num: i + 1,
      activityName: e.activityName || e.delayCause || '',
      activityId: e.activityId || '',
      delayDays: e.delayDays,
      responsibility: formatResponsibility(e.responsibility),
      fidic: e.fidic || '',
      criticalPath: e.criticalPath ? 'Yes' : 'No',
      delayCause: e.delayCause || ''
    }))
  });

  const buf = doc.getZip().generate({ type: 'nodebuffer' });
  const outputPath = path.join(__dirname, '../../outputs', `eot_${Date.now()}.docx`);
  fs.writeFileSync(outputPath, buf);
  return outputPath;
}

/**
 * Fallback: generate a clean docx without template using officegen-style content
 */
async function generateSimpleDocx({ project, calculation, delayEvents, fidic, narrative }) {
  // Use docx library for programmatic generation
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, BorderStyle, WidthType } = require('docx');

  const isQuick = project.isQuickAssessment;
  const eotClause = fidic?.eotClause || '8.4';
  const noticeClause = fidic?.noticeClause || '20.1';
  const editionName = fidic?.name || 'FIDIC Yellow Book 1999';
  const entitledEvents = delayEvents.filter(e => e.eotEntitlement !== false);

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          text: isQuick ? 'EOT QUICK ASSESSMENT — INTERNAL WORKING PAPER' : 'EXTENSION OF TIME CLAIM',
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: `Sub-Clause ${eotClause} — ${editionName}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),

        // Project info table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableRow('Project:', project.projectName || ''),
            tableRow('Contract No:', project.contractNumber || ''),
            tableRow('Contractor:', project.contractorName || ''),
            tableRow('Employer:', project.employerName || ''),
            tableRow('Engineer / PMC:', project.engineerName || ''),
            tableRow('FIDIC Edition:', editionName),
            tableRow('Original Completion:', project.plannedCompletion || ''),
            tableRow('Revised Completion:', project.forecastCompletion || ''),
            tableRow('EOT Claimed:', `${calculation.netEOT} calendar days`),
            tableRow('Submission Date:', new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }))
          ]
        }),

        spacer(),

        // Narrative sections
        heading('1. NARRATIVE'),
        ...narrativeParagraphs(narrative),

        spacer(),

        // Delay event register
        heading('2. DELAY EVENT REGISTER'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ['#', 'Activity / Delay', 'Days', 'Responsibility', 'FIDIC Ref', 'CP?']
                .map(h => new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })]
                }))
            }),
            ...entitledEvents.map((e, i) => new TableRow({
              children: [
                String(i + 1), e.activityName || e.delayCause || '', String(e.delayDays),
                formatResponsibility(e.responsibility), e.fidic || '', e.criticalPath ? 'Yes' : 'No'
              ].map(val => new TableCell({ children: [new Paragraph(String(val))] }))
            }))
          ]
        }),

        spacer(),

        // TIA Summary
        heading('3. TIME IMPACT ANALYSIS SUMMARY'),
        new Table({
          width: { size: 60, type: WidthType.PERCENTAGE },
          rows: [
            tableRow('Employer-caused delay:', `${calculation.employerDays} days`),
            tableRow('Third-party / neutral delay:', `${calculation.neutralDays} days`),
            tableRow('Force majeure delay:', `${calculation.forceMajeureDays || 0} days`),
            tableRow('Concurrent delay (deducted):', `${calculation.concurrentDays} days`),
            tableRow('NET EOT ENTITLEMENT:', `${calculation.netEOT} calendar days`)
          ]
        }),

        spacer(),

        // Footer
        ...(isQuick ? [
          new Paragraph({
            children: [new TextRun({
              text: '⚠ INTERNAL WORKING PAPER — INDICATIVE ASSESSMENT ONLY — NOT FOR SUBMISSION TO ENGINEER',
              bold: true, color: 'FF8C00'
            })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 }
          })
        ] : [
          new Paragraph({
            text: `Prepared by: ${project.contractorName || ''}`,
            spacing: { before: 400 }
          }),
          new Paragraph({ text: `Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}` })
        ])
      ]
    }]
  });

  const buf = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '../../outputs', `eot_${Date.now()}.docx`);

  if (!fs.existsSync(path.join(__dirname, '../../outputs'))) {
    fs.mkdirSync(path.join(__dirname, '../../outputs'), { recursive: true });
  }
  fs.writeFileSync(outputPath, buf);
  return outputPath;
}

// Helpers
function tableRow(label, value) {
  const { TableRow, TableCell, Paragraph, TextRun } = require('docx');
  return new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })] }),
      new TableCell({ children: [new Paragraph(String(value || ''))] })
    ]
  });
}

function heading(text) {
  const { Paragraph, HeadingLevel } = require('docx');
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } });
}

function spacer() {
  const { Paragraph } = require('docx');
  return new Paragraph({ text: '', spacing: { before: 200 } });
}

function narrativeParagraphs(narrative) {
  const { Paragraph } = require('docx');
  if (!narrative) return [new Paragraph('Narrative will be inserted here.')];
  return narrative.split('\n\n').filter(Boolean).map(p => new Paragraph({ text: p, spacing: { after: 150 } }));
}

function formatResponsibility(resp) {
  const map = { employer: 'Employer', neutral: 'Third Party / Authority', force_majeure: 'Force Majeure', contractor: 'Contractor', unknown: 'Under Assessment' };
  return map[resp] || resp || '';
}

module.exports = { generateDocx };
