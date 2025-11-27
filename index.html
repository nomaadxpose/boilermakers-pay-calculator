/* 
  Boilermaker 146 - CRA-style tax + deductions engine
  ---------------------------------------------------
  This file holds the CPP/CPP2/EI/Federal/Alberta tax logic.
  It exposes a single function on window:

      window.BoilerTaxEngine.calculateDeductionsForWeek(
        taxableWeekly,
        nonTaxableWeekly,
        taxMode
      )

  - taxableWeekly   = earnings subject to tax/CPP/EI/dues
  - nonTaxableWeekly = LOA + non-taxable incentive, etc.
  - taxMode         = "early-year" (simple, default) or "annualized"
*/

/* =========================
   1. CONSTANTS (approx 2025)
   ========================= */

// CPP Tier 1
const CPP_RATE = 0.0595;
const CPP_YMPE = 71300;
const CPP_BASIC_EXEMPTION = 3500;
const CPP_MAX_CONTRIB = 4034.10;

// CPP Tier 2
const CPP2_RATE = 0.04;
const CPP2_YAMPE = 81200;
const CPP2_MAX_CONTRIB = 396.00;

// EI
const EI_RATE = 0.0164;
const EI_MAX_INSURABLE = 65700;
const EI_MAX_CONTRIB = 1077.48;

// Federal tax brackets (approx 2025)
const FED_BRACKETS_2025 = [
  { limit: 57375,    rate: 0.15  },
  { limit: 114750,   rate: 0.205 },
  { limit: 177882,   rate: 0.26  },
  { limit: 253414,   rate: 0.29  },
  { limit: Infinity, rate: 0.33  }
];

// Federal basic personal amount & credit rate (approx)
const FED_BPA = 16129;
const FED_CREDIT_RATE = 0.145;

// Alberta tax brackets (approx 2025)
const AB_BRACKETS_2025 = [
  { limit: 60000,    rate: 0.08  },
  { limit: 151234,   rate: 0.10  },
  { limit: 181481,   rate: 0.12  },
  { limit: 241974,   rate: 0.13  },
  { limit: 362961,   rate: 0.14  },
  { limit: Infinity, rate: 0.15  }
];

// Alberta basic personal amount & credit rate (approx)
const AB_BPA = 22323;
const AB_CREDIT_RATE = 0.08;

// Union dues rate (on taxable earnings)
const UNION_DUES_RATE = 0.0375;

/* =========================
   2. HELPERS
   ========================= */

function clamp(value, minVal, maxVal) {
  return Math.max(minVal, Math.min(maxVal, value));
}

/**
 * Apply progressive tax brackets to an annual income.
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

/* =========================
   3. CPP / CPP2 / EI (weekly)
   ========================= */

/**
 * Compute CPP/CPP2/EI for one week of taxable income.
 * mode = "early-year" or "annualized"
 */
function calculateCppEiForWeek(taxableWeekly, mode) {
  const weeksPerYear = 52;
  const annualEarnings = taxableWeekly * weeksPerYear;

  let cppWeekly = 0;
  let cpp2Weekly = 0;
  let eiWeekly = 0;

  if (mode === "annualized") {
    // CPP Tier 1
    const cppPensionableAnnual = clamp(
      annualEarnings - CPP_BASIC_EXEMPTION,
      0,
      CPP_YMPE - CPP_BASIC_EXEMPTION
    );
    const cppAnnualRaw = cppPensionableAnnual * CPP_RATE;
    const cppAnnual = Math.min(cppAnnualRaw, CPP_MAX_CONTRIB);
    cppWeekly = cppAnnual / weeksPerYear;

    // CPP Tier 2
    if (annualEarnings > CPP_YMPE) {
      const cpp2BaseAnnual = clamp(
        annualEarnings - CPP_YMPE,
        0,
        CPP2_YAMPE - CPP_YMPE
      );
      const cpp2AnnualRaw = cpp2BaseAnnual * CPP2_RATE;
      const cpp2Annual = Math.min(cpp2AnnualRaw, CPP2_MAX_CONTRIB);
      cpp2Weekly = cpp2Annual / weeksPerYear;
    }

    // EI
    const eiInsurableAnnual = Math.min(annualEarnings, EI_MAX_INSURABLE);
    const eiAnnualRaw = eiInsurableAnnual * EI_RATE;
    const eiAnnual = Math.min(eiAnnualRaw, EI_MAX_CONTRIB);
    eiWeekly = eiAnnual / weeksPerYear;

  } else {
    // "early-year" – simpler weekly approximation

    // CPP Tier 1
    const cppEarningsWeekly = Math.max(
      0,
      taxableWeekly - (CPP_BASIC_EXEMPTION / weeksPerYear)
    );
    const cppWeeklyRaw = cppEarningsWeekly * CPP_RATE;
    const cppWeeklyMax = CPP_MAX_CONTRIB / weeksPerYear;
    cppWeekly = Math.min(cppWeeklyRaw, cppWeeklyMax);

    // CPP Tier 2 – approximate based on annualized earnings
    if (annualEarnings > CPP_YMPE) {
      const excessEarningsAnnual = clamp(
        annualEarnings - CPP_YMPE,
        0,
        CPP2_YAMPE - CPP_YMPE
      );
      const cpp2Annual = Math.min(excessEarningsAnnual * CPP2_RATE, CPP2_MAX_CONTRIB);
      cpp2Weekly = cpp2Annual / weeksPerYear;
    }

    // EI
    const eiEarningsWeekly = Math.min(
      taxableWeekly,
      EI_MAX_INSURABLE / weeksPerYear
    );
    const eiWeeklyRaw = eiEarningsWeekly * EI_RATE;
    const eiWeeklyMax = EI_MAX_CONTRIB / weeksPerYear;
    eiWeekly = Math.min(eiWeeklyRaw, eiWeeklyMax);
  }

  return { cpp: cppWeekly, cpp2: cpp2Weekly, ei: eiWeekly };
}

/* =========================
   4. INCOME TAX (Federal + Alberta)
   ========================= */

function calculateAnnualFederalTaxGross(annualTaxable) {
  return applyProgressiveTax(annualTaxable, FED_BRACKETS_2025);
}

function calculateAnnualAlbertaTaxGross(annualTaxable) {
  return applyProgressiveTax(annualTaxable, AB_BRACKETS_2025);
}

/**
 * Compute weekly federal + Alberta income tax from weekly taxable income
 * and CPP/EI amounts (for credits).
 */
function calculateIncomeTaxForWeek(taxableWeekly, cppWeekly, eiWeekly) {
  const weeksPerYear = 52;
  const annualTaxable = taxableWeekly * weeksPerYear;

  const cppAnnual = cppWeekly * weeksPerYear;
  const eiAnnual = eiWeekly * weeksPerYear;

  // Federal
  const federalGrossAnnual = calculateAnnualFederalTaxGross(annualTaxable);
  const federalCreditAnnual =
    FED_BPA * FED_CREDIT_RATE +
    (cppAnnual + eiAnnual) * FED_CREDIT_RATE;
  const federalNetAnnual = Math.max(0, federalGrossAnnual - federalCreditAnnual);
  const federalWeekly = federalNetAnnual / weeksPerYear;

  // Alberta
  const abGrossAnnual = calculateAnnualAlbertaTaxGross(annualTaxable);
  const abCreditAnnual =
    AB_BPA * AB_CREDIT_RATE +
    (cppAnnual + eiAnnual) * AB_CREDIT_RATE;
  const abNetAnnual = Math.max(0, abGrossAnnual - abCreditAnnual);
  const abWeekly = abNetAnnual / weeksPerYear;

  return {
    federalWeekly,
    abWeekly
  };
}

/* =========================
   5. MAIN PUBLIC FUNCTION
   ========================= */

/**
 * Calculate full deduction breakdown for ONE week.
 *
 * Inputs:
 *   taxableWeekly     = earnings subject to tax/CPP/EI/dues
 *   nonTaxableWeekly  = LOA + non-taxable incentive, etc.
 *   taxMode           = "early-year" (default) or "annualized"
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
 *     netTaxableOnly,
 *     netPayTotal
 *   }
 */
function calculateDeductionsForWeek(taxableWeekly, nonTaxableWeekly, taxMode) {
  const mode = (taxMode === "annualized") ? "annualized" : "early-year";

  // 1) CPP / CPP2 / EI
  const { cpp, cpp2, ei } = calculateCppEiForWeek(taxableWeekly, mode);

  // 2) Federal + Alberta tax
  const { federalWeekly, abWeekly } = calculateIncomeTaxForWeek(
    taxableWeekly,
    cpp,
    ei
  );

  // 3) Union dues
  const unionDues = taxableWeekly * UNION_DUES_RATE;

  // 4) Total deductions
  const totalDeductions = cpp + cpp2 + ei + federalWeekly + abWeekly + unionDues;

  // 5) Net pay
  const netTaxableOnly = taxableWeekly - totalDeductions;
  const netPayTotal = netTaxableOnly + (nonTaxableWeekly || 0);

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
   6. EXPORT TO WINDOW
   ========================= */

window.BoilerTaxEngine = {
  calculateDeductionsForWeek
};
