import { useEffect } from 'react';
import { ChildcareThreshold, Disclaimer, HowItWorks, Methodology, Privacy, SacrificeVsSipp } from '../content/pages';
import { CalculatorPage } from './CalculatorPage';
import { href, ROUTES, type RouteDef } from './routes';

function Page({ route }: { route: RouteDef }) {
  switch (route.id) {
    case 'calculator':
      return <CalculatorPage />;
    case 'how-it-works':
      return <HowItWorks />;
    case 'salary-sacrifice-vs-sipp':
      return <SacrificeVsSipp />;
    case 'childcare-threshold':
      return <ChildcareThreshold />;
    case 'methodology':
      return <Methodology />;
    case 'privacy':
      return <Privacy />;
    case 'disclaimer':
      return <Disclaimer />;
  }
}

export function App({ route }: { route: RouteDef }) {
  useEffect(() => {
    document.title = route.title;
  }, [route]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="wrap header-inner">
          <a className="brand" href={href('/')}>
            <span className="brand-mark" aria-hidden="true">
              £
            </span>
            100k Tax Trap Calculator
          </a>
          <nav aria-label="Main">
            <ul>
              {ROUTES.filter((r) => r.id !== 'privacy' && r.id !== 'disclaimer').map((r) => (
                <li key={r.id}>
                  <a href={href(r.path)} aria-current={r.id === route.id ? 'page' : undefined}>
                    {r.nav}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" className="wrap" tabIndex={-1}>
        <Page route={route} />
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <p>
            General information only — not financial or tax advice. Not affiliated with or endorsed by HMRC or any pension provider. Calculations run in your browser; nothing
            is sent or stored.
          </p>
          <ul className="footer-links">
            {ROUTES.map((r) => (
              <li key={r.id}>
                <a href={href(r.path)}>{r.nav}</a>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </>
  );
}
