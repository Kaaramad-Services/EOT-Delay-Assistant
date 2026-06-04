/**
 * EOT Calculation Engine
 * Handles all four input modes: P6 full, P6 Gantt, Excel, Manual
 */

/**
 * Calculate days between two dates
 */
export function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Check if two date ranges overlap (concurrent delay detection)
 */
export function datesOverlap(start1, end1, start2, end2) {
  const s1 = new Date(start1), e1 = new Date(end1);
  const s2 = new Date(start2), e2 = new Date(end2);
  return s1 <= e2 && s2 <= e1;
}

/**
 * Calculate overlap days between two date ranges
 */
export function overlapDays(start1, end1, start2, end2) {
  const s1 = new Date(start1), e1 = new Date(end1);
  const s2 = new Date(start2), e2 = new Date(end2);
  const overlapStart = new Date(Math.max(s1, s2));
  const overlapEnd = new Date(Math.min(e1, e2));
  if (overlapStart >= overlapEnd) return 0;
  return Math.round((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
}

/**
 * Classify responsibility
 */
export function classifyResponsibility(resp) {
  const r = (resp || '').toLowerCase();
  if (['employer', 'client', 'owner', 'engineer'].some(k => r.includes(k))) return 'employer';
  if (['contractor', 'our', 'subcontractor', 'ourselves'].some(k => r.includes(k))) return 'contractor';
  if (['force', 'majeure', 'weather', 'storm', 'flood', 'fire', 'act of god'].some(k => r.includes(k))) return 'force_majeure';
  if (['authority', 'utility', 'government', 'ministry', 'municipality', 'third party', 'marafiq', 'sec ', 'neom', 'saudi aramco'].some(k => r.includes(k))) return 'neutral';
  return 'unknown';
}

/**
 * Main EOT calculation function
 * Works for all input modes
 */
export function calculateEOT(delayEvents, projectData) {
  const {
    plannedCompletion,
    forecastCompletion,
    contractStart,
    fidic,
    noticeIssued,
    noticeDate,
    firstDelayDate
  } = projectData;

  // Sort events by start date
  const events = [...delayEvents].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  let employerDays = 0;
  let neutralDays = 0;
  let forceMajeureDays = 0;
  let contractorDays = 0;
  let concurrentDays = 0;
  const processedEvents = [];

  events.forEach((event, i) => {
    const delayDays = event.delayDays || daysBetween(event.startDate, event.endDate);
    const resp = event.responsibility || classifyResponsibility(event.delayCause || '');

    // Check for concurrency with other employer events
    let isConcurrent = false;
    let concurrentWith = null;
    if (resp !== 'contractor') {
      events.forEach((other, j) => {
        if (i !== j && other.responsibility === 'contractor') {
          if (event.startDate && event.endDate && other.startDate && other.endDate) {
            if (datesOverlap(event.startDate, event.endDate, other.startDate, other.endDate)) {
              isConcurrent = true;
              concurrentWith = other.id;
            }
          }
        }
      });
    }

    const criticalPath = event.criticalPath !== false; // default assume critical unless told otherwise
    const eotEntitlement = criticalPath && resp !== 'contractor';

    processedEvents.push({
      ...event,
      delayDays,
      responsibility: resp,
      criticalPath,
      eotEntitlement,
      isConcurrent,
      concurrentWith,
      fidic: event.fidic || autoSelectClause(resp, fidic)
    });

    if (!criticalPath) return; // non-critical = no EOT

    switch (resp) {
      case 'employer':    employerDays += delayDays; break;
      case 'neutral':     neutralDays += delayDays; break;
      case 'force_majeure': forceMajeureDays += delayDays; break;
      case 'contractor':  contractorDays += delayDays; break;
      default:            employerDays += delayDays; // unknown — give benefit of doubt for calculation
    }

    if (isConcurrent) concurrentDays += delayDays;
  });

  // Net EOT = employer + neutral + force majeure - concurrent (where contractor also caused delay)
  const grossEOT = employerDays + neutralDays + forceMajeureDays;
  const netEOT = Math.max(0, grossEOT - concurrentDays);

  // Total project slippage
  const totalSlippage = plannedCompletion && forecastCompletion
    ? daysBetween(plannedCompletion, forecastCompletion)
    : null;

  // Notice compliance check
  const noticeDays = fidic?.includes('2017') ? 28 : 28; // both editions = 28 days
  let noticeCompliant = null;
  let noticeDaysAfterEvent = null;
  if (noticeDate && firstDelayDate) {
    noticeDaysAfterEvent = daysBetween(firstDelayDate, noticeDate);
    noticeCompliant = noticeDaysAfterEvent <= noticeDays;
  }

  return {
    summary: {
      totalEvents: events.length,
      employerDays,
      neutralDays,
      forceMajeureDays,
      contractorDays,
      concurrentDays,
      grossEOT,
      netEOT,
      totalSlippage,
      unexplainedSlippage: totalSlippage ? Math.max(0, totalSlippage - grossEOT - contractorDays) : null
    },
    noticeCompliance: {
      compliant: noticeCompliant,
      daysAfterEvent: noticeDaysAfterEvent,
      requiredDays: noticeDays,
      noticeIssued
    },
    events: processedEvents,
    isQuickAssessment: !projectData.hasScheduleFile
  };
}

/**
 * Auto-select FIDIC clause based on responsibility and edition
 */
export function autoSelectClause(responsibility, fidic) {
  const is2017 = fidic?.includes('2017');
  const eotClause = is2017 ? '8.5' : '8.4';
  const forceClause = is2017 ? '18.1' : '19.1';

  switch (responsibility) {
    case 'employer':      return `Sub-Clause ${eotClause}(a)`;
    case 'neutral':       return `Sub-Clause ${eotClause}(e)`;
    case 'force_majeure': return `Sub-Clause ${forceClause}`;
    case 'contractor':    return null;
    default:              return `Sub-Clause ${eotClause}(b)`;
  }
}

/**
 * Match Excel column headers to expected fields using fuzzy matching
 */
export function matchColumns(headers, synonyms) {
  const result = {};
  const lowerHeaders = headers.map(h => (h || '').toLowerCase().trim());

  Object.entries(synonyms).forEach(([field, variants]) => {
    // Exact match first
    let matched = lowerHeaders.findIndex(h => variants.includes(h));
    // Partial match fallback
    if (matched === -1) {
      matched = lowerHeaders.findIndex(h => variants.some(v => h.includes(v) || v.includes(h)));
    }
    if (matched !== -1) {
      result[field] = { index: matched, header: headers[matched], confidence: 'high' };
    }
  });

  return result;
}

/**
 * Parse Excel rows into delay events using column mapping
 */
export function parseExcelRows(rows, columnMapping, projectData) {
  return rows
    .filter(row => row[columnMapping.activityName?.index]) // skip empty rows
    .map((row, i) => {
      const plannedFinish = row[columnMapping.plannedFinish?.index];
      const actualFinish = row[columnMapping.actualFinish?.index];
      const delayDaysRaw = plannedFinish && actualFinish
        ? daysBetween(plannedFinish, actualFinish)
        : 0;

      return {
        id: `excel-${i}`,
        activityId: row[columnMapping.activityId?.index] || `A${String(i + 1).padStart(3, '0')}`,
        activityName: row[columnMapping.activityName?.index],
        plannedStart: row[columnMapping.plannedStart?.index],
        plannedFinish,
        actualStart: row[columnMapping.actualStart?.index],
        actualFinish,
        delayDays: Math.max(0, delayDaysRaw),
        percentComplete: row[columnMapping.percentComplete?.index],
        delayCause: row[columnMapping.delayCause?.index] || '',
        responsibility: classifyResponsibility(row[columnMapping.responsibility?.index] || ''),
        criticalPath: row[columnMapping.criticalPath?.index]
          ? ['yes', 'true', '1', 'critical', 'y'].includes(String(row[columnMapping.criticalPath.index]).toLowerCase())
          : delayDaysRaw > 5 // heuristic: assume critical if delayed > 5 days
      };
    })
    .filter(e => e.delayDays > 0); // only include delayed activities
}
