/* 
  Boilermaker 146 - CRA-style tax + deductions engine
  ---------------------------------------------------
  This file is meant to be used from your existing pay calculator.

  It expects you to:
    1) Compute total GROSS earnings for the week (taxable + non-taxable).
    2) Compute total TAXABLE earnings for the week (no LOA, no non-taxable incentive).
    3) Call calculateDeductionsForWeek(...) with those amounts and the chosen tax mode.
    4) Use the returned breakdown to display deductions + net pay.

  This is an *estimator*. It uses 2025 rates + brackets for:
    - CPP + CPP2 (Canada Pension Plan, including second tier) 
    - EI (Employment Insurance) 
    - Federal income tax (2025 brackets) 
    - Alberta income tax (2025 brackets + basic personal amount) 

  IMPORTANT:
    - This will get you *very close* to real payroll but will never be 100% identical.
    - CRA uses detailed payroll tables (T4032 / PDOC) with transitional rules and more credits.
    - Always treat this as "Unofficial estimator – actual payroll may differ".
*/

/* =========================
   1. CONSTANTS (2025)
   ========================= */

// --- CPP (Tier 1) 2025 ---
const CPP_RATE = 0.0595;             // 5.95% 
const CPP_YMPE = 71300;              // Yearly Max Pensionable Earnings 2025 
const CPP_BASIC_EXEMPTION = 3500;    // Basic exemption 
const CPP_MAX_CONTRIB = 4034.10;     // Max employee contribution 2025 

// --- CPP2 (Tier 2) 2025 ---
const CPP2_RATE = 0.04;              // 4% 
const CPP2_YAMPE = 81200;            // Year’s Additional Max Pensionable Earnings (upper ceiling) 
const CPP2_MAX_CONTRIB = 396.0;      // Max employee CPP2 contribution 2025 

// --- EI 2025 ---
const EI_RATE = 0.0164;              // 1.64% employee rate 
const EI_MAX_INSURABLE = 65700;      // Max insurable earnings 2025 
const EI_MAX_CONTRIB = 1077.48;      // Max employee EI premium 2025 

// --- Federal tax (2025 brackets) ---
const FED_BRACKETS_2025 = [
  { limit: 57375,         rate: 0.15  },   // 15% up to $57,375 
  { limit: 114750,        rate: 0.205 },   // 20.5% to $114,750
  { limit: 177882,        rate: 0.26  },   // 26% to $177,882
  { limit: 253414,        rate: 0.29  },   // 29% to $253,414
  { limit: Infinity,      rate: 0.33  }    // 33% above
];

// Federal basic personal amount (BPA) – we use the high end (what most people claim on TD1).
// 2025: varies by income, but max around 16,129. We use that for a standard single employee. 
const FED_BPA = 16129;

// CRA uses an effective lowest rate ~14.5% for 2025 personal credits due to mid-year rate change. 
const FED_CREDIT_RATE = 0.145;

// --- Alberta tax (2025 brackets) ---
// Alberta 2025 brackets (final intention): 8% to $60k, then 10%, 12%, 13%, 14%, 15%. 
// CRA’s payroll tables use “prorated” rates; here we use a simplified combined approach for estimating yearly tax. 
//
// To keep it simpler and stable for you, we’ll approximate with these effective 2025 brackets:
const AB_BRACKETS_2025 = [
  { limit: 60000,         rate: 0.08 },    // 8% up to $60,000 (new low bracket)
  { limit: 151234,       rate: 0.10 },    // 10% to $151,234
  { limit: 181481,       rate: 0.12 },    // 12% to $181,481
  { limit: 241974,       rate: 0.13 },    // 13% to $241,974
  { limit: 362961,       rate: 0.14 },    // 14% to $362,961
  { limit: Infinity,     rate: 0.15 }     // 15% above
];

// Alberta basic personal amount (BPA) 2025: about $22,323. 
const AB_BPA = 22323;
// Credits apply at the lowest AB rate (8%) for 2025.
const AB_CREDIT_RATE = 0.08;

// --- Union dues ---
const DEFAULT_UNION_DUES_RATE = 0.0375;  // 3.75% of TAXABLE earnings


/* =========================
   2. HELPER FUNCTIONS
   ========================= */

/**
 * Progressive tax calculator for annual income.
 * brackets = [{ limit, rate }...] sorted by limit ascending.
 */
function applyProgressiveTax(annualIncome, brackets) {
  let remaining = annualIncome;
  let lastLimit = 0;
  let tax = 0;

  for (const bracket of brackets) {
    if (remaining <= 0) break;

    const taxableAtThisRate = Math.min(remaining, bracket.limit - lastLimit);
    if (taxableAtThisRate > 0) {
      tax += taxableAtThisRate * bracket.rate;
      remaining -= taxableAtThisRate;
      lastLimit = bracket.limit;
    }
  }

  return tax;
}

/**
 * Safe clamp helper.
 */
function clamp(value, minVal, maxVal) {
  return Math.max(minVal, Math.min(maxVal, value));
}

/* =========================
   3. CPP / CPP2 / EI
   ========================= */

/**
 * Calculate CPP + CPP2 + EI for a WEEK, using two modes:
 *  - mode "early-year": approximate based only on weekly earnings (no fancy annualization)
 *  - mode "annualized": uses weekly * 52 and applies caps on an annual basis, then splits back per week
 *
 * taxableWeekly = TAXABLE earnings only (no LOA, no non-taxable incentive)
 */
function calculateCppEiForWeek(taxableWeekly, mode) {
  const weeksPerYear = 52;
  const annualEarnings = taxableWeekly * weeksPerYear;

  let cppWeekly = 0;
  let cpp2Weekly = 0;
  let eiWeekly = 0;

  if (mode === "early-year") {
    // Simple "it's early in the year" approximation:
    // CPP: (weekly earnings - basic exemption/52) * rate, never negative, capped by per-week max.
    const cppEarningsWeekly = Math.max(0, taxableWeekly - (CPP_BASIC_EXEMPTION / weeksPerYear));
    cppWeekly = cppEarningsWeekly * CPP_RATE;
    const cppWeeklyMax = CPP_MAX_CONTRIB / weeksPerYear;
    if (cppWeekly > cppWeeklyMax) cppWeekly = cppWeeklyMax;

    // CPP2: Only if weekly earnings suggest you’re above YMPE.
    // We approximate by checking if annualized > YMPE.
    if (annualEarnings > CPP_YMPE) {
      const excessEarningsAnnual = clamp(annualEarnings - CPP_YMPE, 0, CPP2_YAMPE - CPP_YMPE);
      const cpp2Annual = excessEarningsAnnual * CPP2_RATE;
      const cpp2AnnualCapped = Math.min(cpp2Annual, CPP2_MAX_CONTRIB);
      cpp2Weekly = cpp2AnnualCapped / weeksPerYear;
    }

    // EI: simple weekly rate, capped at annual max / 52.
    const eiEarningsWeekly = Math.min(taxableWeekly, EI_MAX_INSURABLE / weeksPerYear);
    eiWeekly = eiEarningsWeekly * EI_RATE;
    const eiWeeklyMax = EI_MAX_CONTRIB / weeksPerYear;
    if (eiWeekly > eiWeeklyMax) eiWeekly = eiWeeklyMax;

  } else {
    // "annualized" mode: do it all on an annual basis then divide by 52.
    // CPP Tier 1
    const cppPensionableAnnual = clamp(annualEarnings - CPP_BASIC_EXEMPTION, 0, CPP_YMPE - CPP_BASIC_EXEMPTION);
    const cppAnnualRaw = cppPensionableAnnual * CPP_RATE;
    const cppAnnual = Math.min(cppAnnualRaw, CPP_MAX_CONTRIB);
    cppWeekly = cppAnnual / weeksPerYear;

    // CPP2
    if (annualEarnings > CPP_YMPE) {
      const cpp2BaseAnnual = clamp(annualEarnings - CPP_YMPE, 0, CPP2_YAMPE - CPP_YMPE);
      const cpp2AnnualRaw = cpp2BaseAnnual * CPP2_RATE;
      const cpp2Annual = Math.min(cpp2AnnualRaw, CPP2_MAX_CONTRIB);
      cpp2Weekly = cpp2Annual / weeksPerYear;
    }

    // EI
    const eiInsurableAnnual = Math.min(annualEarnings, EI_MAX_INSURABLE);
    const eiAnnualRaw = eiInsurableAnnual * EI_RATE;
    const eiAnnual = Math.min(eiAnnualRaw, EI_MAX_CONTRIB);
    eiWeekly = eiAnnual / weeksPerYear;
  }

  return {
    cpp: cppWeekly,
    cpp2: cpp2Weekly,
    ei: eiWeekly
  };
}

/* =========================
   4. FEDERAL + ALBERTA TAX
   ========================= */

/**
 * Federal tax for the year, before credits, from annual taxable income.
 */
function calculateAnnualFederalTaxGross(annualTaxable) {
  return applyProgressiveTax(annualTaxable, FED_BRACKETS_2025);
}

/**
 * Alberta tax for the year, before credits, from annual taxable income.
 */
function calculateAnnualAlbertaTaxGross(annualTaxable) {
  return applyProgressiveTax(annualTaxable, AB_BRACKETS_2025);
}

/**
 * Calculate weekly Federal + AB tax, including:
 *  - Basic personal amount credits
 *  - CPP/EI non-refundable credits (at lowest rate)
 *
 *  annualTaxable = taxableWeekly * 52
 *  cppWeekly, eiWeekly = from calculateCppEiForWeek(...)
 */
function calculateIncomeTaxForWeek(taxableWeekly, cppWeekly, eiWeekly, mode) {
  const weeksPerYear = 52;
  const annualTaxable = taxableWeekly * weeksPerYear;

  // --- Annual CPP/EI from weekly (for credits) ---
  const cppAnnual = cppWeekly * weeksPerYear;
  const eiAnnual = eiWeekly * weeksPerYear;

  // --- Federal ---
  const federalGrossAnnual = calculateAnnualFederalTaxGross(annualTaxable);

  // Credits: BPA + CPP/EI, all at credit rate
  // We assume the user is under the income cutoff so they can claim full maximum BPA amount. 
  const federalCreditAnnual = FED_BPA * FED_CREDIT_RATE
    + (cppAnnual + eiAnnual) * FED_CREDIT_RATE;

  const federalNetAnnual = Math.max(0, federalGrossAnnual - federalCreditAnnual);
  const federalWeekly = federalNetAnnual / weeksPerYear;

  // --- Alberta ---
  const abGrossAnnual = calculateAnnualAlbertaTaxGross(annualTaxable);

  // Credits: AB BPA + CPP/EI at lowest AB rate (approximation)
  const abCreditAnnual = AB_BPA * AB_CREDIT_RATE
    + (cppAnnual + eiAnnual) * AB_CREDIT_RATE;

  const abNetAnnual = Math.max(0, abGrossAnnual - abCreditAnnual);
  const abWeekly = abNetAnnual / weeksPerYear;

  return {
    federalWeekly,
    abWeekly
  };
}

/* =========================
   5. MAIN ENTRY FUNCTION
   ========================= */

/**
 * Calculate full deduction breakdown for ONE week.
 *
 * Inputs:
 *   taxableWeekly   = earnings that ARE subject to tax, CPP, EI, union dues
 *                     (wages, OT, night premium, vacation, stat, taxable incentive)
 *   nonTaxableWeekly = earnings that are NOT subject to income tax/CPP/EI/dues
 *                      (LOA, non-taxable incentive, etc.)
 *   options = {
 *     unionDuesRate: number (default 0.0375),
 *     taxMode: "early-year" | "annualized"  (default: "early-year")
 *   }
 *
 * Returns:
 *   {
 *     cpp,
 *     cpp2,
 *     ei,
 *     federalTax,
 *     albertaTax,
 *     unionDues,
 *     totalDeductions,
 *     netPayTotal,       // net after all deductions INCLUDING non-taxable earnings
 *     netTaxableOnly     // net of taxable portion only (before LOA/non-taxable)
 *   }
 */
function calculateDeductionsForWeek(taxableWeekly, nonTaxableWeekly = 0, options = {}) {
  const unionDuesRate = options.unionDuesRate ?? DEFAULT_UNION_DUES_RATE;
  const taxMode = options.taxMode === "annualized" ? "annualized" : "early-year";

  // 1) CPP / CPP2 / EI
  const { cpp, cpp2, ei } = calculateCppEiForWeek(taxableWeekly, taxMode);

  // 2) Income tax (Federal + Alberta), using annualized method under the hood
  const { federalWeekly, abWeekly } = calculateIncomeTaxForWeek(
    taxableWeekly,
    cpp,
    ei,
    taxMode
  );

  // 3) Union dues = % of TAXABLE earnings
  const unionDues = taxableWeekly * unionDuesRate;

  // 4) Sum all deductions
  const totalDeductions = cpp + cpp2 + ei + federalWeekly + abWeekly + unionDues;

  // 5) Net pay:
  //    - "Taxable" net = taxableWeekly - all deductions
  //    - Total net = taxableNet + non-taxable (LOA + non-taxable incentive)
  const netTaxableOnly = taxableWeekly - totalDeductions;
  const netPayTotal = netTaxableOnly + nonTaxableWeekly;

  return {
    cpp,
    cpp2,
    ei,
    federalTax: federalWeekly,
    albertaTax: abWeekly,
    unionDues,
    totalDeductions,
    netTaxableOnly,
    netPayTotal
  };
}

/* =========================
   6. UI HOOK (to call from your existing code)
   =========================

   You ALREADY have:
     - A function that calculates all the earnings for the week.
     - That function ends with something like:

       const totalEarnings = ...;        // includes LOA + incentives
       const taxableEarnings = ...;      // excludes LOA + non-taxable incentive
       const nonTaxableEarnings = ...;   // LOA + non-taxable incentive

   Wherever you currently compute "taxes" with a flat %,
   REPLACE that section with a call to calculateDeductionsForWeek().

   Example (you will adapt to your variable names):

   -------------------------------------------------------------------

   // 1) Decide which tax mode is selected in the UI:
   const taxModeRadio = document.querySelector('input[name="taxMode"]:checked');
   const taxMode = taxModeRadio ? taxModeRadio.value : "early-year"; // fallback

   // 2) Call CRA engine with your weekly numbers:
   const deductions = calculateDeductionsForWeek(
     taxableEarnings,
     nonTaxableEarnings,
     { taxMode: taxMode, unionDuesRate: 0.0375 }
   );

   // 3) Use "deductions" to populate your results section:
   document.getElementById("cppAmount").textContent        = deductions.cpp.toFixed(2);
   document.getElementById("cpp2Amount").textContent       = deductions.cpp2.toFixed(2);
   document.getElementById("eiAmount").textContent         = deductions.ei.toFixed(2);
   document.getElementById("federalTaxAmount").textContent = deductions.federalTax.toFixed(2);
   document.getElementById("albertaTaxAmount").textContent = deductions.albertaTax.toFixed(2);
   document.getElementById("unionDuesAmount").textContent  = deductions.unionDues.toFixed(2);

   document.getElementById("totalDeductions").textContent  = deductions.totalDeductions.toFixed(2);
   document.getElementById("netPayAmount").textContent     = deductions.netPayTotal.toFixed(2);

   -------------------------------------------------------------------

   You can adjust those ID names to match whatever your HTML uses.
*/

// To make these functions available globally in the browser:
window.BoilerTaxEngine = {
  calculateDeductionsForWeek
};
