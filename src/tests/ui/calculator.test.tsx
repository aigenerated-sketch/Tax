import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalculatorPage } from '../../app/CalculatorPage';
import { defaultFormState } from '../../lib/form';

const setup = (overrides: Partial<ReturnType<typeof defaultFormState>> = {}) =>
  render(<CalculatorPage initial={{ ...defaultFormState(), ...overrides }} />);

describe('calculator UI', () => {
  it('asks for a salary before showing results (no fabricated defaults)', () => {
    setup();
    expect(screen.getByText(/Enter your salary to see results/)).toBeInTheDocument();
    expect(screen.queryByTestId('current-ani')).not.toBeInTheDocument();
  });

  it('shows engine results after a salary is typed', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText(/Annual gross salary/), '110000');
    expect(screen.getByTestId('current-ani')).toHaveTextContent('£110,000');
    expect(screen.getByTestId('marginal-it')).toHaveTextContent('60%');
    expect(screen.getByTestId('marginal-combined')).toHaveTextContent('62%');
    expect(screen.getByTestId('required-gross')).toHaveTextContent('£10,000');
    expect(screen.getByTestId('target-takehome')).toHaveTextContent('−£3,800');
  });

  it('switching to Scotland changes the marginal rate', async () => {
    const user = userEvent.setup();
    setup({ salary: '110000' });
    await user.selectOptions(screen.getByLabelText(/Income Tax jurisdiction/), 'scotland');
    expect(screen.getByTestId('marginal-it')).toHaveTextContent('67.5%');
    expect(screen.getByTestId('marginal-combined')).toHaveTextContent('69.5%');
  });

  it('slider and numeric input stay in sync and do not change other inputs', async () => {
    const user = userEvent.setup();
    setup({ salary: '110000' });
    const slider = screen.getByLabelText(/slider/);
    fireEvent.change(slider, { target: { value: '10000' } });
    const box = screen.getByLabelText(/^Gross contribution$/);
    expect(box).toHaveValue('10000');
    expect(screen.getByTestId('slider-gross')).toHaveTextContent('£10,000.00');
    expect(screen.getByTestId('slider-ani')).toHaveTextContent('£100,000.00');
    expect(screen.getByTestId('slider-takehome')).toHaveTextContent('−£3,800.00');
    await user.clear(box);
    await user.type(box, '5000');
    expect(slider).toHaveValue('5000');
    expect(screen.getByLabelText(/Annual gross salary/)).toHaveValue('110000');
    expect(screen.getByTestId('current-ani')).toHaveTextContent('£110,000');
  });

  it('"set to the amount needed" button fills the contribution', async () => {
    const user = userEvent.setup();
    setup({ salary: '110000' });
    await user.click(screen.getByRole('button', { name: /Set to the amount needed/ }));
    expect(screen.getByLabelText(/^Gross contribution$/)).toHaveValue('10000');
  });

  it('invalid input hides results, explains the problem and keeps entries', async () => {
    const user = userEvent.setup();
    setup({ salary: '110000' });
    await user.type(screen.getByLabelText(/Expected bonus/), '-500');
    expect(screen.getByText('Check your entries')).toBeInTheDocument();
    expect(screen.getAllByText(/Bonus cannot be negative/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('current-ani')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Annual gross salary/)).toHaveValue('110000');
  });

  it('already below target: says no contribution is needed', () => {
    setup({ salary: '90000' });
    expect(screen.getByTestId('required-gross')).toHaveTextContent('None needed');
  });

  it('childcare with unknown answers shows "Eligibility not confirmed"', () => {
    setup({ salary: '90000', childcareAssess: true, hasChild: 'yes', childAge: '3-to-4' });
    const section = screen.getByRole('heading', { name: 'Childcare eligibility' }).closest('section') as HTMLElement;
    const badges = [...section.querySelectorAll('.badge')].map((b) => b.textContent ?? '');
    expect(badges.some((t) => t.includes('Eligibility not confirmed'))).toBe(true);
    expect(badges.some((t) => t.includes('Appears eligible'))).toBe(false);
  });

  it('comparison table lists all four methods', () => {
    setup({ salary: '110000', additionalGross: '10000' });
    const table = screen.getByRole('region', { name: 'Method comparison table' });
    for (const m of ['Salary sacrifice', 'Net-pay workplace pension', 'Relief-at-source workplace pension', 'Relief-at-source SIPP / personal pension']) {
      expect(within(table).getByRole('columnheader', { name: new RegExp(m) })).toBeInTheDocument();
    }
  });

  it('chart text alternative shows the same take-home as the results', () => {
    setup({ salary: '110000', additionalGross: '10000' });
    const t = screen.getByTestId('chart-table');
    expect(within(t).getByText('£72,357.40')).toBeInTheDocument();
    expect(within(t).getByText('£68,557.40')).toBeInTheDocument();
  });

  it('print button calls window.print, and reports failure accessibly', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    window.print = spy;
    setup({ salary: '110000' });
    await user.click(screen.getByRole('button', { name: /Print/ }));
    expect(spy).toHaveBeenCalled();
    window.print = () => {
      throw new Error('blocked');
    };
    await user.click(screen.getByRole('button', { name: /Print/ }));
    expect(screen.getByText(/Printing is not available/)).toBeInTheDocument();
  });

  it('every form control has an accessible label', () => {
    setup({ salary: '110000', childcareAssess: true, hasPartner: 'yes' });
    const controls = document.querySelectorAll('input:not([type=radio]), select, textarea');
    controls.forEach((el) => {
      const id = el.getAttribute('id');
      const labelled = (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || el.getAttribute('aria-label') || el.closest('label');
      expect(labelled, `control ${el.outerHTML.slice(0, 80)}`).toBeTruthy();
    });
  });
});
