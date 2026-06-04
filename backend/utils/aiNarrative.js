/**
 * AI Narrative Generator
 * Priority: Gemini 2.0 Flash → Groq Llama3 → OllamaFreeAPI → Template fallback
 */

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

/**
 * Build a detailed FIDIC-aware prompt from structured EOT data
 */
function buildPrompt(data) {
  const { project, calculation, delayEvents, fidic } = data;
  const edition = fidic?.name || 'FIDIC Yellow Book 1999';
  const eotClause = fidic?.eotClause || '8.4';
  const noticeClause = fidic?.noticeClause || '20.1';

  const eventsText = delayEvents
    .filter(e => e.eotEntitlement)
    .map((e, i) =>
      `Event ${i + 1}: "${e.activityName || e.delayCause}" — ${e.delayDays} calendar days — Responsibility: ${e.responsibility} — FIDIC ref: ${e.fidic || 'Sub-Clause ' + eotClause}`
    ).join('\n');

  return `You are a specialist construction claims consultant writing a formal Extension of Time (EOT) submission under FIDIC contract conditions.

Write a professional, formal EOT claim narrative for the following project. Use precise legal language appropriate for submission to an Engineer under FIDIC conditions. Do not use informal language. Structure the response as formal claim paragraphs only.

PROJECT DETAILS:
- Project: ${project.projectName}
- Contract No: ${project.contractNumber}
- Contractor: ${project.contractorName}
- Employer: ${project.employerName}
- Engineer/PMC: ${project.engineerName || 'The Engineer'}
- FIDIC Edition: ${edition}
- Original Completion Date: ${project.plannedCompletion}
- Current Forecast Completion: ${project.forecastCompletion}
- EOT Claimed: ${calculation.netEOT} calendar days
- Notice Reference: ${project.noticeReference || 'As submitted'}
- Notice Date: ${project.noticeDate || 'Within required period'}

DELAY EVENTS GIVING ENTITLEMENT:
${eventsText}

CALCULATION SUMMARY:
- Employer-caused delay: ${calculation.employerDays} days
- Third-party/neutral delay: ${calculation.neutralDays} days  
- Concurrent (deducted): ${calculation.concurrentDays} days
- Net EOT entitlement: ${calculation.netEOT} days

Write the following sections:
1. EXECUTIVE SUMMARY (2-3 sentences)
2. CONTRACTUAL BASIS (cite Sub-Clause ${eotClause} and Sub-Clause ${noticeClause} specifically)
3. DELAY EVENT ANALYSIS (one paragraph per delay event, formal language)
4. TIME IMPACT ANALYSIS SUMMARY (how delays affected critical path)
5. CONCLUSION AND ENTITLEMENT (formal statement of days claimed)

Use "the Contractor", "the Employer", "the Engineer" throughout. Do not use company names in the body text. Be precise and professional.`;
}

/**
 * Template-based fallback — no AI needed
 */
function generateTemplate(data) {
  const { project, calculation, delayEvents, fidic } = data;
  const edition = fidic?.name || 'FIDIC Yellow Book 1999';
  const eotClause = fidic?.eotClause || '8.4';
  const noticeClause = fidic?.noticeClause || '20.1';
  const entitledEvents = delayEvents.filter(e => e.eotEntitlement);

  const eventParagraphs = entitledEvents.map((e, i) => `
${i + 1}. ${(e.activityName || e.delayCause || 'Delay Event').toUpperCase()}

The Contractor hereby records that ${e.delayCause || 'a delay event'} resulted in a delay of ${e.delayDays} calendar days to the critical path. This delay is attributable to ${e.responsibility === 'employer' ? 'the Employer' : e.responsibility === 'neutral' ? 'a third-party authority' : 'exceptional circumstances'} and gives rise to entitlement pursuant to ${e.fidic || `Sub-Clause ${eotClause}`} of the Conditions of Contract.`).join('\n');

  return `EXTENSION OF TIME CLAIM
Sub-Clause ${eotClause} — ${edition}

Contract No: ${project.contractNumber || '[CONTRACT NUMBER]'}
Project: ${project.projectName || '[PROJECT NAME]'}
Date of Submission: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. EXECUTIVE SUMMARY

The Contractor submits this claim for an Extension of Time of ${calculation.netEOT} calendar days pursuant to Sub-Clause ${eotClause} of the ${edition} Conditions of Contract. The extension is sought in respect of ${entitledEvents.length} delay event(s) arising from causes beyond the Contractor's control, as detailed herein.

2. CONTRACTUAL BASIS

This claim is submitted in accordance with Sub-Clause ${noticeClause} of the Conditions of Contract. The Contractor has given timely notice of its intention to claim an extension of time. Pursuant to Sub-Clause ${eotClause}, the Contractor is entitled to an extension of the Time for Completion where delay has been caused by the Employer, Employer's Personnel, or other causes specified therein.

3. DELAY EVENT ANALYSIS
${eventParagraphs}

4. TIME IMPACT ANALYSIS

The cumulative effect of the above delay events on the critical path of the Works has been assessed as follows:

- Total employer-caused delay on critical path: ${calculation.employerDays} calendar days
- Total third-party/neutral delay on critical path: ${calculation.neutralDays} calendar days  
- Concurrent delay (deducted): ${calculation.concurrentDays} calendar days
- Net Extension of Time entitlement: ${calculation.netEOT} calendar days

5. CONCLUSION

The Contractor respectfully requests that the Engineer grants an Extension of Time of ${calculation.netEOT} calendar days pursuant to Sub-Clause ${eotClause} of the Conditions of Contract, extending the Time for Completion from ${project.plannedCompletion || '[ORIGINAL DATE]'} to ${project.forecastCompletion || '[REVISED DATE]'}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${project.isQuickAssessment ? '\n⚠ INTERNAL WORKING PAPER — INDICATIVE ASSESSMENT ONLY — NOT FOR SUBMISSION TO ENGINEER\nUpload schedule file (XER or Excel) to generate a fully substantiated formal submission.\n' : ''}
Prepared by: ${project.contractorName || '[CONTRACTOR]'}
Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`;
}

/**
 * Try Gemini 2.0 Flash (primary)
 */
async function tryGemini(prompt) {
  if (!GEMINI_KEY) throw new Error('No Gemini key');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(30000)
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text;
}

/**
 * Try Groq Llama3 (fallback)
 */
async function tryGroq(prompt) {
  if (!GROQ_KEY) throw new Error('No Groq key');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000
    }),
    signal: AbortSignal.timeout(30000)
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content;
}

/**
 * Try OllamaFreeAPI (third fallback — community servers)
 */
async function tryOllamaFree(prompt) {
  const res = await fetch('https://free.ollamaapi.com/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2:3b',
      messages: [{ role: 'user', content: prompt }],
      stream: false
    }),
    signal: AbortSignal.timeout(45000)
  });
  if (!res.ok) throw new Error(`OllamaFreeAPI ${res.status}`);
  const json = await res.json();
  return json.message?.content;
}

/**
 * Main export — tries all sources in order
 */
async function generateNarrative(data) {
  const prompt = buildPrompt(data);
  const sources = [
    { name: 'Gemini', fn: () => tryGemini(prompt) },
    { name: 'Groq',   fn: () => tryGroq(prompt) },
    { name: 'Ollama', fn: () => tryOllamaFree(prompt) }
  ];

  for (const source of sources) {
    try {
      console.log(`Trying ${source.name}...`);
      const text = await source.fn();
      if (text?.length > 100) {
        console.log(`Success via ${source.name}`);
        return { narrative: text, source: source.name, aiGenerated: true };
      }
    } catch (err) {
      console.warn(`${source.name} failed: ${err.message}`);
    }
  }

  // All AI failed — use template
  console.log('All AI sources failed — using template');
  return {
    narrative: generateTemplate(data),
    source: 'template',
    aiGenerated: false
  };
}

module.exports = { generateNarrative, generateTemplate };
