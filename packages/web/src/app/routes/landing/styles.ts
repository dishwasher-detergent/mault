export const responsiveStyles = `
  @media (max-width: 640px) {
    .lp-nav {
      padding: 1rem 1.25rem;
    }
    .lp-nav-external {
      display: none;
    }
    .lp-nav-divider {
      display: none;
    }
    .lp-hero {
      padding: 3rem 1.25rem 2.5rem;
    }
    .lp-stats-item {
      flex: 0 0 50%;
      padding: 1.75rem 1rem !important;
      border-right: none !important;
      border-bottom: 1px solid #1a1a1a;
      box-sizing: border-box;
    }
    .lp-stats-item:nth-child(odd) {
      border-right: 1px solid #1a1a1a !important;
    }
    .lp-stats-item:nth-last-child(-n+2) {
      border-bottom: none;
    }
    .lp-section {
      padding: 3.5rem 1.25rem;
    }
    .lp-features-grid {
      grid-template-columns: 1fr !important;
    }
    .lp-feature-card {
      padding: 1.75rem !important;
    }
    .lp-pipeline-steps {
      flex-direction: column;
      align-items: stretch;
    }
    .lp-pipeline-step {
      flex: none !important;
      min-width: 0 !important;
      width: 100%;
      flex-direction: column;
    }
    .lp-pipeline-step-inner {
      flex-direction: row !important;
      align-items: center !important;
      text-align: left !important;
      padding: 0.5rem 0 !important;
      gap: 1rem !important;
    }
    .lp-step-label {
      text-align: left !important;
    }
    .lp-pipeline-connector {
      width: 1px !important;
      height: 1.5rem !important;
      margin-left: 25px !important;
      margin-top: 0 !important;
      align-self: auto !important;
    }
    .lp-rarity-grid {
      grid-template-columns: 1fr 1fr !important;
    }
    .lp-cta {
      padding: 4rem 1.25rem;
    }
    .lp-footer {
      padding: 1.5rem 1.25rem;
      flex-direction: column;
      align-items: flex-start;
    }
    .lp-footer-right {
      flex-direction: column;
      gap: 0.6rem !important;
    }
  }

  @media (max-width: 400px) {
    .lp-rarity-grid {
      grid-template-columns: 1fr !important;
    }
  }
`;
