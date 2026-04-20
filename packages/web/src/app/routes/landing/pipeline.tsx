const steps = [
  { label: "Webcam captures card", icon: "▶" },
  { label: "OpenCV isolates artwork", icon: "◈" },
  { label: "SigLIP finds the match", icon: "◉" },
  { label: "Rules assign a bin", icon: "◎" },
  { label: "Arduino routes the card", icon: "◆" },
];

export function LandingPipeline() {
  return (
    <section
      style={{
        background: "#0f0f0f",
        borderTop: "1px solid #1a1a1a",
        borderBottom: "1px solid #1a1a1a",
        padding: "6rem 2.5rem",
      }}
    >
      <div
        className="lp-section"
        style={{ maxWidth: "1200px", margin: "0 auto" }}
      >
        <p
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "0.7rem",
            letterSpacing: "0.2em",
            color: "#999",
            marginBottom: "1rem",
          }}
        >
          THE PIPELINE
        </p>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#f5f5f5",
            marginBottom: "4rem",
            lineHeight: 1.05,
          }}
        >
          FROM LENS
          <br />
          TO BIN.
        </h2>

        <div
          className="lp-pipeline-steps"
          style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}
        >
          {steps.map((step, i) => (
            <div
              key={i}
              className="lp-pipeline-step"
              style={{ display: "flex", alignItems: "center", flex: "1", minWidth: "140px" }}
            >
              <div
                className="lp-pipeline-step-inner"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.75rem",
                  flex: 1,
                  padding: "1.5rem 0.5rem",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    flexShrink: 0,
                    borderRadius: "50%",
                    background: i === 0 ? "#7C3AED" : "#1a1a1a",
                    border: `2px solid ${i === 0 ? "#7C3AED" : "#2a2a2a"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-heading)",
                    fontSize: "1.1rem",
                    color: i === 0 ? "#fff" : "#888",
                    fontWeight: 700,
                  }}
                >
                  {step.icon}
                </div>
                <span
                  className="lp-step-label"
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "0.65rem",
                    letterSpacing: "0.1em",
                    color: "#999",
                    textAlign: "center",
                    lineHeight: 1.4,
                  }}
                >
                  {step.label.toUpperCase()}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="lp-pipeline-connector"
                  style={{
                    flexShrink: 0,
                    height: "1px",
                    width: "2rem",
                    background: "#2a2a2a",
                    alignSelf: "center",
                    marginTop: "-1.5rem",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
