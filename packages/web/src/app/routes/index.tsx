import { neon } from "@/lib/auth/client";
import { Link, useNavigate } from "react-router-dom";

const features = [
  {
    number: "01",
    title: "Vision-Powered Scanning",
    body: "Point your webcam at any card. OpenCV detects the border, our AI model identifies it in milliseconds using 768-dimensional image embeddings.",
    bg: "#7C3AED",
    fg: "#fff",
    accent: "#C4B5FD",
  },
  {
    number: "02",
    title: "Rule-Based Sorting",
    body: "Define up to 7 physical bins with nested AND/OR rule trees. Filter by color, rarity, CMC, type, set, value — anything on the card.",
    bg: "#F59E0B",
    fg: "#0a0a0a",
    accent: "#78350F",
  },
  {
    number: "03",
    title: "Hardware Control",
    body: "Paired with an Arduino servo controller over Web Serial API. Sort decisions become physical motion — automatically routed to the right bin.",
    bg: "#EF4444",
    fg: "#fff",
    accent: "#FCA5A5",
  },
];

const steps = [
  { label: "Webcam captures card", icon: "▶" },
  { label: "OpenCV isolates artwork", icon: "◈" },
  { label: "SigLIP finds the match", icon: "◉" },
  { label: "Rules assign a bin", icon: "◎" },
  { label: "Arduino routes the card", icon: "◆" },
];

export default function LandingPage() {
  const { data, isPending } = neon.auth.useSession();
  const isSignedIn = !isPending && !!data?.user;
  const navigate = useNavigate();

  async function handleSignOut() {
    await neon.auth.signOut();
    navigate("/");
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "#0a0a0a", color: "#f5f5f5" }}
    >
      {/* NAV */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.5rem 2.5rem",
          borderBottom: "1px solid #222",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: "0.12em",
            color: "#7C3AED",
          }}
        >
          MAGIC VAULT
        </span>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {isSignedIn ? (
            <>
              <button
                onClick={handleSignOut}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#aaa",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-heading)",
                  letterSpacing: "0.08em",
                  padding: 0,
                  transition: "color 0.15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseOut={(e) => (e.currentTarget.style.color = "#aaa")}
              >
                SIGN OUT
              </button>
              <Link
                to="/app"
                style={{
                  background: "#7C3AED",
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-heading)",
                  letterSpacing: "0.08em",
                  padding: "0.5rem 1.25rem",
                  borderRadius: "0.3rem",
                  transition: "background 0.15s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#6D28D9")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#7C3AED")
                }
              >
                GO TO APP
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/auth/sign-in"
                style={{
                  color: "#aaa",
                  textDecoration: "none",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-heading)",
                  letterSpacing: "0.08em",
                  transition: "color 0.15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseOut={(e) => (e.currentTarget.style.color = "#aaa")}
              >
                SIGN IN
              </Link>
              <Link
                to="/auth/sign-up"
                style={{
                  background: "#7C3AED",
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-heading)",
                  letterSpacing: "0.08em",
                  padding: "0.5rem 1.25rem",
                  borderRadius: "0.3rem",
                  transition: "background 0.15s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#6D28D9")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#7C3AED")
                }
              >
                GET STARTED
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section
        style={{
          padding: "6rem 2.5rem 5rem",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "#7C3AED",
            color: "#fff",
            fontFamily: "var(--font-heading)",
            fontSize: "0.7rem",
            letterSpacing: "0.18em",
            padding: "0.35rem 0.9rem",
            borderRadius: "2rem",
            marginBottom: "2rem",
            fontWeight: 600,
          }}
        >
          OPEN SOURCE · MTG SORTER
        </div>

        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(3.5rem, 10vw, 8rem)",
            fontWeight: 800,
            lineHeight: 0.92,
            letterSpacing: "-0.03em",
            margin: "0 0 1.5rem",
            color: "#f5f5f5",
          }}
        >
          SORT YOUR
          <br />
          <span style={{ color: "#7C3AED" }}>COLLECTION</span>
          <br />
          AT THE SPEED
          <br />
          OF SIGHT.
        </h1>

        <p
          style={{
            fontSize: "1.15rem",
            color: "#999",
            maxWidth: "520px",
            lineHeight: 1.65,
            marginBottom: "3rem",
            fontFamily: "var(--font-sans)",
          }}
        >
          Point a webcam at your cards. Machine learning identifies each one in
          milliseconds. A physical servo controller routes them into labeled
          bins — automatically.
        </p>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {isSignedIn ? (
            <>
              <Link
                to="/app"
                style={{
                  background: "#7C3AED",
                  color: "#fff",
                  textDecoration: "none",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  letterSpacing: "0.1em",
                  padding: "1rem 2.25rem",
                  borderRadius: "0.4rem",
                  transition: "background 0.15s, transform 0.1s",
                  display: "inline-block",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#6D28D9";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#7C3AED";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                GO TO APP
              </Link>
              <button
                onClick={handleSignOut}
                style={{
                  background: "transparent",
                  color: "#f5f5f5",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  letterSpacing: "0.1em",
                  padding: "1rem 2.25rem",
                  borderRadius: "0.4rem",
                  border: "1.5px solid #333",
                  cursor: "pointer",
                  transition: "border-color 0.15s, transform 0.1s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#555";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#333";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                SIGN OUT
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth/sign-up"
                style={{
                  background: "#7C3AED",
                  color: "#fff",
                  textDecoration: "none",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  letterSpacing: "0.1em",
                  padding: "1rem 2.25rem",
                  borderRadius: "0.4rem",
                  transition: "background 0.15s, transform 0.1s",
                  display: "inline-block",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#6D28D9";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#7C3AED";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                START SORTING
              </Link>
              <Link
                to="/auth/sign-in"
                style={{
                  background: "transparent",
                  color: "#f5f5f5",
                  textDecoration: "none",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  letterSpacing: "0.1em",
                  padding: "1rem 2.25rem",
                  borderRadius: "0.4rem",
                  border: "1.5px solid #333",
                  transition: "border-color 0.15s, transform 0.1s",
                  display: "inline-block",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#555";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#333";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                SIGN IN
              </Link>
            </>
          )}
        </div>
      </section>

      {/* STATS STRIP */}
      <div
        style={{
          borderTop: "1px solid #1a1a1a",
          borderBottom: "1px solid #1a1a1a",
          background: "#0f0f0f",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "0",
        }}
      >
        {[
          { value: "7", label: "Sort Bins" },
          { value: "13", label: "Rule Operators" },
          { value: "8", label: "Card Fields" },
          { value: "768", label: "Vector Dimensions" },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              padding: "2.5rem 4rem",
              textAlign: "center",
              borderRight: i < 3 ? "1px solid #1a1a1a" : "none",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "2.5rem",
                fontWeight: 800,
                color: "#7C3AED",
                lineHeight: 1,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.65rem",
                letterSpacing: "0.15em",
                color: "#555",
                marginTop: "0.4rem",
              }}
            >
              {stat.label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* FEATURES */}
      <section
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
            color: "#555",
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
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {features.map((f) => (
            <div
              key={f.number}
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
                }}
              >
                {f.title.toUpperCase()}
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.9rem",
                  lineHeight: 1.65,
                  opacity: 0.85,
                  margin: 0,
                }}
              >
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        style={{
          background: "#0f0f0f",
          borderTop: "1px solid #1a1a1a",
          borderBottom: "1px solid #1a1a1a",
          padding: "6rem 2.5rem",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "0.7rem",
              letterSpacing: "0.2em",
              color: "#555",
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
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0",
            }}
          >
            {steps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0",
                  flex: "1",
                  minWidth: "140px",
                }}
              >
                <div
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
                      borderRadius: "50%",
                      background: i === 0 ? "#7C3AED" : "#1a1a1a",
                      border: `2px solid ${i === 0 ? "#7C3AED" : "#2a2a2a"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-heading)",
                      fontSize: "1.1rem",
                      color: i === 0 ? "#fff" : "#555",
                      fontWeight: 700,
                    }}
                  >
                    {step.icon}
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "0.65rem",
                      letterSpacing: "0.1em",
                      color: "#666",
                      textAlign: "center",
                      lineHeight: 1.4,
                    }}
                  >
                    {step.label.toUpperCase()}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    style={{
                      flex: "0 0 auto",
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

      {/* RARITY COLORS SECTION */}
      <section
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
            color: "#555",
            marginBottom: "1rem",
          }}
        >
          RULE ENGINE
        </p>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#f5f5f5",
            marginBottom: "3rem",
            lineHeight: 1.05,
          }}
        >
          BUILD RULES,
          <br />
          NOT SPREADSHEETS.
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1px",
            background: "#1a1a1a",
            borderRadius: "0.75rem",
            overflow: "hidden",
          }}
        >
          {[
            {
              label: "MYTHIC",
              desc: "Route chase rares to a dedicated bin automatically.",
              color: "oklch(73.235% 0.17251 55.531)",
              bg: "#1a1008",
            },
            {
              label: "RARE",
              desc: "Gold cards for your trade binder, sorted on the fly.",
              color: "oklch(83.828% 0.16176 98.163)",
              bg: "#18170a",
            },
            {
              label: "UNCOMMON",
              desc: "Silver cards neatly separated from the bulk.",
              color: "oklch(78.194% 0.09549 244.199)",
              bg: "#0a1018",
            },
            {
              label: "COMMON",
              desc: "Bulk commons sorted by color, CMC, or set.",
              color: "oklch(60% 0 0)",
              bg: "#111",
            },
          ].map((rarity) => (
            <div
              key={rarity.label}
              style={{
                background: rarity.bg,
                padding: "2rem 1.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: rarity.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "0.75rem",
                    letterSpacing: "0.15em",
                    color: rarity.color,
                    fontWeight: 700,
                  }}
                >
                  {rarity.label}
                </span>
              </div>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.85rem",
                  color: "#777",
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {rarity.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section
        style={{
          background: "#7C3AED",
          padding: "6rem 2.5rem",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(2.5rem, 8vw, 6rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#fff",
            lineHeight: 0.95,
            marginBottom: "1.5rem",
          }}
        >
          READY TO
          <br />
          START SORTING?
        </h2>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "1.05rem",
            color: "#C4B5FD",
            marginBottom: "2.5rem",
            lineHeight: 1.6,
          }}
        >
          Create a free account and connect your hardware.
        </p>
        <Link
          to={isSignedIn ? "/app" : "/auth/sign-up"}
          style={{
            background: "#fff",
            color: "#7C3AED",
            textDecoration: "none",
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: "0.9rem",
            letterSpacing: "0.12em",
            padding: "1.1rem 3rem",
            borderRadius: "0.4rem",
            display: "inline-block",
            transition: "background 0.15s, transform 0.1s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "#EDE9FE";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {isSignedIn ? "GO TO APP" : "CREATE ACCOUNT"}
        </Link>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid #1a1a1a",
          padding: "2rem 2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "0.75rem",
            color: "#333",
            letterSpacing: "0.1em",
          }}
        >
          MAGIC VAULT
        </span>
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "0.65rem",
            color: "#333",
            letterSpacing: "0.08em",
          }}
        >
          NOT AFFILIATED WITH WIZARDS OF THE COAST
        </span>
      </footer>
    </div>
  );
}
