import type { ScenarioResult } from '../engine/types';

export interface ChartSegment {
  key: 'takeHome' | 'incomeTax' | 'employeeNi' | 'studentLoan' | 'employeePension' | 'reliefTopUp' | 'employerPension';
  label: string;
  value: number; // pence
}

/**
 * Breakdown used by both the SVG chart and its text alternative.
 * Segments sum to: gross pay & income + basic-rate top-up + employer contributions.
 */
export function chartSegments(s: ScenarioResult): ChartSegment[] {
  const employeeCashPension = s.pension.salarySacrifice + s.pension.netPay + s.rasCashPaid;
  // Gross relief-at-source contributions minus what the employee actually paid = provider's basic-rate top-up.
  const topUp = s.pension.rasWorkplaceGross + s.pension.rasPersonalGross - s.rasCashPaid;
  return [
    { key: 'takeHome', label: 'Take-home', value: s.takeHome },
    { key: 'incomeTax', label: 'Income Tax', value: s.incomeTax.total },
    { key: 'employeeNi', label: 'Employee NI', value: s.employeeNi.total },
    { key: 'studentLoan', label: 'Student loan', value: s.studentLoan.total },
    { key: 'employeePension', label: 'Your pension contributions (pay given up or paid)', value: employeeCashPension },
    { key: 'reliefTopUp', label: 'Basic-rate top-up added by pension provider', value: topUp },
    { key: 'employerPension', label: 'Employer pension contributions', value: s.employerContribution },
  ];
}
