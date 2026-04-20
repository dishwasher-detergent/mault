const features = [
  {
    number: "01",
    title: "Vision-Powered Scanning",
    body: "Point your webcam at any card. OpenCV detects the border, our AI model identifies it in milliseconds using 768-dimensional image embeddings.",
    bg: "#7C3AED",
    fg: "#fff",
    accent: "#fff",
  },
  {
    number: "02",
    title: "Rule-Based Sorting",
    body: "Define up to 7 physical bins with nested AND/OR rule trees. Filter by color, rarity, CMC, type, set, value — anything on the card.",
    bg: "#F59E0B",
    fg: "#0a0a0a",
    accent: "#0a0a0a",
  },
  {
    number: "03",
    title: "Hardware Control",
    body: "Paired with an Arduino servo controller over Web Serial API. Sort decisions become physical motion — automatically routed to the right bin.",
    bg: "#DC2626",
    fg: "#fff",
    accent: "#fff",
  },
];

export function LandingFeatures() {
  return (
    <section
      className="lp-section"
      style={{
        padding: "6rem 2.5rem",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
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
        FEATURES
      </p>
      <h2
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "#f5f5f5",
          marginBottom: "3.5rem",
          lineHeight: 1.05,
        }}
      >
        EVERYTHING YOU NEED
        <br />
        TO SORT SMARTER.
      </h2>

      <div
        className="lp-features-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {features.map((f) => (
          <div
            key={f.number}
            className="lp-feature-card"
            style={{
              background: f.bg,
              color: f.fg,
              borderRadius: "0.75rem",
              padding: "2.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.7rem",
                letterSpacing: "0.18em",
                color: f.accent,
                fontWeight: 600,
              }}
            >
              {f.number}
            </span>
            <h3
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.35rem",
                fontWeight: 800,
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
                margin: 0,
                color: f.fg,
              }}
            >
              {f.title.toUpperCase()}
            </h3>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.9rem",
                lineHeight: 1.65,
                color: f.fg,
                margin: 0,
              }}
            >
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
