import { useState, useEffect, useRef, useCallback } from "react";

const PLAYER_COLORS = [
  { bg: "#1a3a5c", accent: "#3b82f6", name: "Sapphire" },
  { bg: "#5c1a1a", accent: "#ef4444", name: "Crimson" },
  { bg: "#1a4a2e", accent: "#22c55e", name: "Emerald" },
  { bg: "#4a1a5c", accent: "#a855f7", name: "Amethyst" },
  { bg: "#5c4a1a", accent: "#eab308", name: "Gold" },
  { bg: "#1a4a4a", accent: "#14b8a6", name: "Teal" },
];

// Full color palette for player selection
const COLOR_PALETTE = [
  // Row 1: MTG-inspired
  { bg: "#3d3520", accent: "#e6d088", name: "White" },
  { bg: "#1a2a5c", accent: "#4d9de0", name: "Blue" },
  { bg: "#0a0a0a", accent: "#888888", name: "Black" },
  { bg: "#5c1a1a", accent: "#e04d4d", name: "Red" },
  { bg: "#1a3d1a", accent: "#4dbb5f", name: "Green" },
  // Row 2: Extended
  { bg: "#1a3a5c", accent: "#3b82f6", name: "Sapphire" },
  { bg: "#4a1a5c", accent: "#a855f7", name: "Amethyst" },
  { bg: "#5c4a1a", accent: "#eab308", name: "Gold" },
  { bg: "#1a4a4a", accent: "#14b8a6", name: "Teal" },
  { bg: "#5c1a3a", accent: "#ec4899", name: "Pink" },
  // Row 3: More options
  { bg: "#4a3a1a", accent: "#f97316", name: "Orange" },
  { bg: "#2a2a2a", accent: "#999999", name: "Gray" },
  { bg: "#1a1a3d", accent: "#6366f1", name: "Indigo" },
  { bg: "#3d1a1a", accent: "#b91c1c", name: "Maroon" },
  { bg: "#1a3d3d", accent: "#06b6d4", name: "Cyan" },
];

const DEFAULT_LIFE = 40;
const COMMIT_DELAY = 1500; // ms before delta commits to history

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Long-press hook
function useLongPress(callback, { step = 1, bigStep = 10, delay = 1000, interval = 500 } = {}) {
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);
  const isPressed = useRef(false);
  const didLongPress = useRef(false);

  const clear = useCallback(() => {
    isPressed.current = false;
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const start = useCallback((direction) => {
    isPressed.current = true;
    didLongPress.current = false;
    timeoutRef.current = setTimeout(() => {
      if (!isPressed.current) return;
      didLongPress.current = true;
      callback(direction * bigStep);
      intervalRef.current = setInterval(() => {
        if (!isPressed.current) { clear(); return; }
        callback(direction * bigStep);
      }, interval);
    }, delay);
  }, [callback, bigStep, delay, interval, clear]);

  const stop = useCallback((direction) => {
    const wasLongPress = didLongPress.current;
    clear();
    if (!wasLongPress) {
      callback(direction * step);
    }
    didLongPress.current = false;
  }, [callback, step, clear]);

  const handlers = useCallback((direction) => ({
    onMouseDown: (e) => { e.preventDefault(); start(direction); },
    onMouseUp: () => stop(direction),
    onMouseLeave: () => { clear(); didLongPress.current = false; },
    onTouchStart: (e) => { e.preventDefault(); start(direction); },
    onTouchEnd: () => stop(direction),
    onTouchCancel: () => { clear(); didLongPress.current = false; },
  }), [start, stop, clear]);

  useEffect(() => clear, [clear]);
  return handlers;
}

// Tracks the running life delta, shows it next to life, commits after COMMIT_DELAY
function useLifeDelta(onCommit) {
  const [delta, setDelta] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const commitTimer = useRef(null);
  const fadeTimer = useRef(null);
  const deltaRef = useRef(0);

  const addDelta = useCallback((change) => {
    // Clear any pending commit/fade
    if (commitTimer.current) clearTimeout(commitTimer.current);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setFading(false);

    const newDelta = deltaRef.current + change;
    deltaRef.current = newDelta;
    setDelta(newDelta);
    setVisible(true);

    // After COMMIT_DELAY of no changes, commit and fade
    commitTimer.current = setTimeout(() => {
      if (deltaRef.current !== 0) {
        onCommit(deltaRef.current);
      }
      setFading(true);
      fadeTimer.current = setTimeout(() => {
        setVisible(false);
        setFading(false);
        setDelta(0);
        deltaRef.current = 0;
      }, 300); // fade-out animation duration
    }, COMMIT_DELAY);
  }, [onCommit]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  return { delta, visible, fading, addDelta };
}

function LifeDeltaDisplay({ delta, visible, fading }) {
  if (!visible || delta === 0) return null;

  const isNegative = delta < 0;
  const text = isNegative ? `${delta}` : `+${delta}`;
  const color = isNegative ? "#ef4444" : "#22c55e";

  // Position right next to the life counter: negative on left, positive on right
  const side = isNegative ? { right: "100%", marginRight: "0.4vw" } : { left: "100%", marginLeft: "0.4vw" };

  return (
    <div style={{
      position: "absolute",
      ...side,
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: "clamp(16px, 2.2vw, 34px)",
      fontWeight: "bold",
      fontFamily: "'Cinzel', serif",
      color: color,
      textShadow: `0 0 10px ${color}88, 0 2px 6px rgba(0,0,0,0.8)`,
      opacity: fading ? 0 : 1,
      transition: "opacity 0.3s ease-out",
      pointerEvents: "none",
      whiteSpace: "nowrap",
    }}>
      {text}
    </div>
  );
}

function LifeHistoryBadge({ history, accentColor }) {
  const [showHistory, setShowHistory] = useState(false);
  const ref = useRef(null);

  // Click outside to close
  useEffect(() => {
    if (!showHistory) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowHistory(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showHistory]);

  const hasEntries = history.length > 0;
  const reversed = [...history].reverse();

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {/* Icon button — no border, just the icon with a notification badge */}
      <button
        onClick={() => hasEntries && setShowHistory(true)}
        style={{
          background: "transparent",
          border: "none",
          padding: "0.3vh 0.3vw",
          cursor: hasEntries ? "pointer" : "default",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: hasEntries ? 0.7 : 0.25,
          transition: "opacity 0.2s ease",
        }}
      >
        <svg
          width="clamp(18px, 1.6vw, 26px)"
          height="clamp(18px, 1.6vw, 26px)"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="9" y1="16" x2="13" y2="16" />
        </svg>
        {/* Notification badge — small circle with count */}
        {hasEntries && (
          <div style={{
            position: "absolute",
            top: "-2px",
            right: "-4px",
            minWidth: "clamp(14px, 1.1vw, 20px)",
            height: "clamp(14px, 1.1vw, 20px)",
            borderRadius: "50%",
            background: accentColor || "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "clamp(8px, 0.6vw, 11px)",
            fontWeight: "bold",
            fontFamily: "'Cinzel', serif",
            color: "#fff",
            lineHeight: 1,
            boxShadow: `0 0 6px ${accentColor || "#3b82f6"}88`,
          }}>{history.length}</div>
        )}
      </button>
      {showHistory && hasEntries && (
        <div style={{
          position: "absolute", top: "100%", right: 0,
          background: "rgba(15,15,30,0.95)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px", padding: "0.5vh 0.6vw",
          marginTop: "4px", zIndex: 50,
          boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
          maxHeight: "20vh", overflowY: "auto",
          minWidth: "clamp(70px, 6vw, 110px)",
          backdropFilter: "blur(10px)",
        }}>
          {reversed.map((entry, i) => (
            <div key={i} style={{
              fontSize: "clamp(10px, 0.9vw, 15px)",
              fontFamily: "'Cinzel', serif",
              fontWeight: "bold",
              color: entry > 0 ? "#22c55e" : entry < 0 ? "#ef4444" : "rgba(255,255,255,0.3)",
              padding: "0.2vh 0.3vw",
              borderBottom: i < reversed.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              textAlign: "right",
            }}>
              {entry > 0 ? `+${entry}` : entry}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommanderSearch({ onSelect, playerIndex, commanderName, accentColor }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);

  // Click outside to close everything
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShowSuggestions(false);
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(
    debounce(async (q) => {
      if (q.length < 2) { setSuggestions([]); return; }
      setLoading(true);
      try {
        const res = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(data.data?.slice(0, 8) || []);
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
      setLoading(false);
    }, 300),
    []
  );

  const handleSelect = async (name) => {
    setQuery("");
    setShowSuggestions(false);
    setExpanded(false);
    try {
      const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
      const card = await res.json();
      const artUrl = card.image_uris?.art_crop || card.card_faces?.[0]?.image_uris?.art_crop || null;
      const colorIdentity = card.color_identity || [];
      onSelect({ name: card.name, art: artUrl, colorIdentity });
    } catch {
      onSelect({ name, art: null, colorIdentity: [] });
    }
  };

  const handleExpand = () => {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const displayName = commanderName || "No commander selected";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Top row: magnifying glass + commander name */}
      <div
        onClick={handleExpand}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4vw",
          cursor: "pointer",
          padding: "0.2vh 0",
        }}
      >
        <svg width="clamp(14px, 1.2vw, 20px)" height="clamp(14px, 1.2vw, 20px)" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span style={{
          fontSize: "clamp(10px, 1vw, 16px)",
          color: commanderName ? (accentColor || "rgba(255,255,255,0.7)") : "rgba(255,255,255,0.35)",
          fontFamily: "'Quattrocento', serif",
          fontStyle: commanderName ? "italic" : "normal",
          textShadow: commanderName ? "0 1px 3px rgba(0,0,0,0.5)" : "none",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{displayName}</span>
      </div>

      {/* Expandable search field — appears below */}
      {expanded && (
        <div style={{ marginTop: "0.4vh" }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
            onFocus={() => suggestions.length && setShowSuggestions(true)}
            placeholder="Search commander..."
            style={{
              width: "100%",
              padding: "0.6vh 0.8vw",
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "clamp(12px, 1.1vw, 18px)",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "'Quattrocento', serif",
            }}
          />
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "6px", marginTop: "4px", maxHeight: "30vh", overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)"
        }}>
          {suggestions.map((s, i) => (
            <div key={i} onClick={() => handleSelect(s)} style={{
              padding: "0.8vh 1vw", cursor: "pointer",
              fontSize: "clamp(12px, 1.1vw, 18px)", color: "#e0e0e0",
              borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              fontFamily: "'Quattrocento', serif",
            }}
              onMouseEnter={(e) => e.target.style.background = "rgba(255,255,255,0.1)"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCounter({ label, value, onChange, min = null, color = "#fff", small = false, enableLongPress = true }) {
  const btnSize = small ? "clamp(24px, 2.6vw, 42px)" : "clamp(34px, 3.6vw, 56px)";
  const numSize = small ? "clamp(16px, 2.2vw, 30px)" : "clamp(28px, 4.2vw, 62px)";
  const labelSize = small ? "clamp(8px, 0.8vw, 13px)" : "clamp(10px, 1vw, 16px)";

  const valueRef = useRef(value);
  valueRef.current = value;

  const handleDelta = useCallback((delta) => {
    const newVal = valueRef.current + delta;
    if (min !== null) {
      onChange(Math.max(min, newVal));
    } else {
      onChange(newVal);
    }
  }, [onChange, min]);

  const longPress = useLongPress(handleDelta, {
    step: 1,
    bigStep: 10,
    delay: 1000,
    interval: 500,
  });

  const minusHandlers = enableLongPress ? longPress(-1) : {
    onClick: () => onChange(min !== null ? Math.max(min, value - 1) : value - 1)
  };
  const plusHandlers = enableLongPress ? longPress(1) : {
    onClick: () => onChange(value + 1)
  };

  const btnStyle = {
    width: btnSize, height: btnSize,
    borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.1)", color: "#fff",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: small ? "clamp(12px, 1.4vw, 22px)" : "clamp(16px, 1.8vw, 28px)",
    fontWeight: "bold", lineHeight: 1, userSelect: "none",
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: small ? "0.3vw" : "0.5vw",
      background: "rgba(0,0,0,0.35)", borderRadius: "8px",
      padding: small ? "0.3vh 0.4vw" : "0.5vh 0.6vw",
    }}>
      <button {...minusHandlers} style={btnStyle}>−</button>
      <div style={{ textAlign: "center", minWidth: small ? "clamp(28px, 3vw, 50px)" : "clamp(40px, 4.5vw, 80px)" }}>
        <div style={{
          fontSize: numSize, fontWeight: "bold", color,
          fontFamily: "'Cinzel', serif", lineHeight: 1.1,
        }}>{value}</div>
        {label && <div style={{
          fontSize: labelSize, textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)", letterSpacing: "0.5px",
          fontFamily: "'Quattrocento', serif",
        }}>{label}</div>}
      </div>
      <button {...plusHandlers} style={btnStyle}>+</button>
    </div>
  );
}

function CommanderDamagePanel({ player, allPlayers, onDamageChange }) {
  const opponents = allPlayers.filter((_, i) => i !== player.index);
  if (opponents.length === 0) return null;

  return (
    <div style={{ marginTop: "auto", paddingTop: "1vh" }}>
      <div style={{
        fontSize: "clamp(8px, 0.8vw, 13px)", textTransform: "uppercase",
        color: "rgba(255,255,255,0.45)",
        letterSpacing: "1px", marginBottom: "0.5vh", fontFamily: "'Quattrocento', serif",
        textAlign: "center",
      }}>Commander Damage</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4vw", justifyContent: "center" }}>
        {opponents.map((opp) => {
          const dmg = player.commanderDamage[opp.index] || 0;
          const oppColor = opp.customColor || PLAYER_COLORS[opp.index];
          return (
            <div key={opp.index} style={{
              display: "flex", alignItems: "center", gap: "0.3vw",
              background: "rgba(0,0,0,0.3)", borderRadius: "6px", padding: "0.3vh 0.5vw",
              border: `1px solid ${oppColor.accent}33`,
            }}>
              <div style={{
                width: "clamp(8px, 0.8vw, 14px)", height: "clamp(8px, 0.8vw, 14px)",
                borderRadius: "50%",
                background: oppColor.accent,
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: "clamp(9px, 0.9vw, 15px)", color: "rgba(255,255,255,0.6)",
                fontFamily: "'Quattrocento', serif", maxWidth: "clamp(50px, 5vw, 100px)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{opp.name || `Player ${opp.index + 1}`}</span>
              <StatCounter
                label="" value={dmg} min={0} small
                onChange={(v) => onDamageChange(opp.index, v)}
                color={oppColor.accent}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ColorPicker({ currentColor, playerNumber, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* Player number badge — click to open palette */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: "clamp(24px, 2.5vw, 40px)", height: "clamp(24px, 2.5vw, 40px)",
          borderRadius: "50%",
          background: currentColor.accent,
          display: "flex", alignItems: "center",
          justifyContent: "center", fontWeight: "bold",
          fontSize: "clamp(12px, 1.3vw, 22px)",
          color: "#fff", fontFamily: "'Cinzel', serif",
          boxShadow: `0 0 12px ${currentColor.accent}66`,
          cursor: "pointer",
          transition: "transform 0.15s ease",
          transform: open ? "scale(1.1)" : "scale(1)",
        }}
      >{playerNumber}</div>

      {/* Color palette dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0,
          background: "rgba(15,15,30,0.95)", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "10px", padding: "0.6vh 0.6vw",
          marginTop: "6px", zIndex: 60,
          boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
          backdropFilter: "blur(10px)",
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "6px",
        }}>
          {COLOR_PALETTE.map((c, i) => (
            <div
              key={i}
              onClick={() => { onSelect(c); setOpen(false); }}
              style={{
                width: "clamp(20px, 2vw, 32px)",
                height: "clamp(20px, 2vw, 32px)",
                borderRadius: "50%",
                background: c.accent,
                cursor: "pointer",
                border: c.accent === currentColor.accent ? "2.5px solid #fff" : "2px solid rgba(255,255,255,0.1)",
                boxShadow: c.accent === currentColor.accent ? `0 0 10px ${c.accent}` : "none",
                transition: "all 0.15s ease",
              }}
              title={c.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerPanel({ player, allPlayers, onUpdate, onDamageChange, onCommitDelta }) {
  const defaultColor = PLAYER_COLORS[player.index];
  const color = player.customColor || defaultColor;
  const hasArt = !!player.commanderArt;

  const { delta, visible, fading, addDelta } = useLifeDelta((committedDelta) => {
    onCommitDelta(committedDelta);
  });

  // Wrap life changes to also track delta
  const handleLifeChange = (newLife) => {
    const change = newLife - player.life;
    addDelta(change);
    onUpdate({ life: newLife });
  };

  // Wrap commander damage to also track delta (life changes come through here too)
  const handleDamageChange = (fromIndex, newDmgValue) => {
    const oldDmg = player.commanderDamage[fromIndex] || 0;
    const lifeDelta = -(newDmgValue - oldDmg); // damage up = life down
    addDelta(lifeDelta);
    onDamageChange(fromIndex, newDmgValue);
  };

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      borderRadius: 0,
      border: "none",
      background: hasArt ? "#000" : color.bg,
      height: "100%", display: "flex", flexDirection: "column",
      transition: "all 0.3s ease",
    }}>
      {hasArt && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${player.commanderArt})`,
          backgroundSize: "cover", backgroundPosition: "center 20%",
          opacity: 0.5, transition: "opacity 0.6s ease",
        }} />
      )}
      {/* Darkening gradient for text readability */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0.85) 100%)`,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        boxShadow: `inset 0 0 30px ${color.accent}15`,
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative", zIndex: 1, padding: "clamp(8px, 1.5vh, 20px) clamp(8px, 1.2vw, 20px)",
        flex: 1, display: "flex", flexDirection: "column",
        overflowY: "auto", overflowX: "hidden",
      }}>
        {/* History icon — top right corner */}
        <div style={{ position: "absolute", top: "1vh", right: "1vw", zIndex: 2 }}>
          <LifeHistoryBadge history={player.lifeHistory || []} accentColor={color.accent} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5vw", marginBottom: "0.8vh",
        }}>
          <ColorPicker
            currentColor={color}
            playerNumber={player.index + 1}
            onSelect={(c) => onUpdate({ customColor: c })}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              type="text"
              value={player.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder={`Player ${player.index + 1}`}
              style={{
                background: "transparent", border: "none", color: "#fff",
                fontSize: "clamp(14px, 1.5vw, 24px)", fontWeight: "bold", width: "100%",
                outline: "none", fontFamily: "'Cinzel', serif",
                textShadow: "0 2px 6px rgba(0,0,0,0.7)",
              }}
            />
          </div>
        </div>

        {/* Commander Search + Name */}
        <CommanderSearch
          playerIndex={player.index}
          commanderName={player.commanderName}
          accentColor={color.accent}
          onSelect={({ name, art }) => onUpdate({ commanderName: name, commanderArt: art })}
        />

        {/* Life Total with Delta Display */}
        <div style={{
          display: "flex", justifyContent: "center", margin: "1.5vh 0 1vh",
        }}>
          <div style={{ position: "relative", display: "inline-flex" }}>
            <LifeDeltaDisplay delta={delta} visible={visible} fading={fading} />
            <StatCounter
              label="Life" value={player.life}
              onChange={handleLifeChange}
              color={color.accent}
            />
          </div>
        </div>

        {/* Secondary Stats */}
        <div style={{ display: "flex", gap: "0.5vw", justifyContent: "center", flexWrap: "wrap" }}>
          <StatCounter
            label="Poison" value={player.poison} min={0} small
            onChange={(v) => onUpdate({ poison: v })}
            color="#a3e635"
          />
          <StatCounter
            label="Energy" value={player.energy} min={0} small
            onChange={(v) => onUpdate({ energy: v })}
            color="#facc15"
          />
        </div>

        {/* Commander Damage */}
        <CommanderDamagePanel
          player={player}
          allPlayers={allPlayers}
          onDamageChange={handleDamageChange}
        />

        {/* Death indicators */}
        {(player.life <= 0 || player.poison >= 10) && (
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%) rotate(-15deg)",
            fontSize: "clamp(24px, 3vw, 48px)", fontWeight: "bold", color: "#ef4444",
            fontFamily: "'Cinzel', serif", textShadow: "0 2px 12px rgba(0,0,0,0.9)",
            opacity: 0.85, pointerEvents: "none", letterSpacing: "4px",
          }}>DEFEATED</div>
        )}
        {Object.values(player.commanderDamage).some(d => d >= 21) && (
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%) rotate(-15deg)",
            fontSize: "clamp(18px, 2.2vw, 36px)", fontWeight: "bold", color: "#f97316",
            fontFamily: "'Cinzel', serif", textShadow: "0 2px 12px rgba(0,0,0,0.9)",
            opacity: 0.85, pointerEvents: "none", letterSpacing: "2px",
            textAlign: "center",
          }}>COMMANDER{"\n"}LETHAL</div>
        )}
      </div>
    </div>
  );
}

function SetupScreen({ onStart }) {
  const [count, setCount] = useState(4);

  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a1a 100%)",
      fontFamily: "'Quattrocento', serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Cinzel:wght@400;700&family=Quattrocento:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center" }}>
        <h1 style={{
          fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
          fontSize: "clamp(28px, 4vw, 60px)", color: "#e0d5c0",
          textShadow: "0 0 40px rgba(212,175,55,0.3)", marginBottom: "8px",
          letterSpacing: "3px",
        }}>Commander Tracker</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "40px",
          fontSize: "clamp(12px, 1.2vw, 20px)" }}>
          Track life, commander damage, poison & energy
        </p>

        <div style={{ marginBottom: "32px" }}>
          <div style={{
            fontSize: "clamp(11px, 1vw, 16px)", textTransform: "uppercase", letterSpacing: "2px",
            color: "rgba(255,255,255,0.5)", marginBottom: "16px",
          }}>Number of Players</div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            {[2, 3, 4, 5, 6].map((n) => (
              <button key={n} onClick={() => setCount(n)} style={{
                width: "clamp(40px, 4vw, 64px)", height: "clamp(40px, 4vw, 64px)",
                borderRadius: "12px",
                border: count === n ? "2px solid #d4af37" : "2px solid rgba(255,255,255,0.1)",
                background: count === n ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.05)",
                color: count === n ? "#d4af37" : "rgba(255,255,255,0.5)",
                fontSize: "clamp(18px, 2vw, 32px)", fontWeight: "bold", cursor: "pointer",
                fontFamily: "'Cinzel', serif",
                transition: "all 0.2s ease",
                boxShadow: count === n ? "0 0 20px rgba(212,175,55,0.2)" : "none",
              }}>{n}</button>
            ))}
          </div>
        </div>

        <button onClick={() => onStart(count)} style={{
          padding: "1.5vh 3vw", borderRadius: "12px",
          border: "2px solid #d4af37",
          background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))",
          color: "#d4af37", fontSize: "clamp(14px, 1.3vw, 22px)", fontWeight: "bold",
          cursor: "pointer", fontFamily: "'Cinzel', serif",
          letterSpacing: "3px", textTransform: "uppercase",
          boxShadow: "0 0 30px rgba(212,175,55,0.15)",
          transition: "all 0.2s ease",
        }}>Begin Game</button>
      </div>
    </div>
  );
}

// Detect screen orientation and size for responsive layout
function useScreenLayout() {
  const [layout, setLayout] = useState(() => getLayout());

  function getLayout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ratio = w / h;
    return {
      isPortrait: ratio < 0.9,
      isSquarish: ratio >= 0.9 && ratio <= 1.3,
      isLandscape: ratio > 1.3,
      isSmall: w < 768,
      isMedium: w >= 768 && w < 1200,
      isLarge: w >= 1200,
      width: w,
      height: h,
    };
  }

  useEffect(() => {
    const handler = () => setLayout(getLayout());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return layout;
}

function getGridStyle(count, layout) {
  const { isPortrait, isSmall } = layout;

  // Portrait / phone: stack vertically or 2 columns max
  if (isPortrait || isSmall) {
    if (count <= 2) return { gridTemplateColumns: "1fr", gridTemplateRows: "repeat(2, 1fr)" };
    if (count <= 4) return { gridTemplateColumns: "repeat(2, 1fr)", gridTemplateRows: `repeat(${Math.ceil(count / 2)}, 1fr)` };
    return { gridTemplateColumns: "repeat(2, 1fr)", gridTemplateRows: `repeat(${Math.ceil(count / 2)}, 1fr)` };
  }

  // Landscape / desktop: wider layouts
  if (count <= 2) return { gridTemplateColumns: "repeat(2, 1fr)", gridTemplateRows: "1fr" };
  if (count === 3) return { gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "1fr" };
  if (count <= 4) return { gridTemplateColumns: "repeat(2, 1fr)", gridTemplateRows: "repeat(2, 1fr)" };
  if (count === 5) return { gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)" };
  return { gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)" };
}

const STORAGE_KEY = "mtg-commander-tracker";

function saveState(started, players) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ started, players }));
  } catch (e) { /* silently fail if storage is full */ }
}

function loadState() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) { /* corrupted data, ignore */ }
  return null;
}

export default function App() {
  const layout = useScreenLayout();
  const [started, setStarted] = useState(() => {
    const saved = loadState();
    return saved ? saved.started : false;
  });
  const [players, setPlayers] = useState(() => {
    const saved = loadState();
    return saved ? saved.players : [];
  });

  // Auto-save whenever state changes
  useEffect(() => {
    saveState(started, players);
  }, [started, players]);

  const startGame = (count) => {
    const ps = Array.from({ length: count }, (_, i) => ({
      index: i,
      name: "",
      life: DEFAULT_LIFE,
      poison: 0,
      energy: 0,
      commanderName: "",
      commanderArt: null,
      customColor: null,
      commanderDamage: {},
      lifeHistory: [],
    }));
    setPlayers(ps);
    setStarted(true);
  };

  const updatePlayer = (index, updates) => {
    setPlayers((prev) => prev.map((p) => (p.index === index ? { ...p, ...updates } : p)));
  };

  const updateCommanderDamage = (playerIndex, fromIndex, newDmgValue) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.index !== playerIndex) return p;
        const oldDmg = p.commanderDamage[fromIndex] || 0;
        const delta = newDmgValue - oldDmg;
        return {
          ...p,
          commanderDamage: { ...p.commanderDamage, [fromIndex]: newDmgValue },
          life: p.life - delta,
        };
      })
    );
  };

  const commitLifeDelta = (playerIndex, delta) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.index !== playerIndex) return p;
        return {
          ...p,
          lifeHistory: [...p.lifeHistory, delta],
        };
      })
    );
  };

  const resetGame = () => {
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        life: DEFAULT_LIFE,
        poison: 0,
        energy: 0,
        commanderDamage: {},
        lifeHistory: [],
      }))
    );
  };

  const newGame = () => {
    setStarted(false);
    setPlayers([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (!started) return <SetupScreen onStart={startGame} />;

  return (
    <div style={{
      height: "100vh",
      width: "100vw",
      background: "#0a0a1a",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      boxSizing: "border-box",
      fontFamily: "'Quattrocento', serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Cinzel:wght@400;700&family=Quattrocento:wght@400;700&display=swap" rel="stylesheet" />

      {/* Top Bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0.5vh 1vw", flexShrink: 0,
      }}>
        <h1 style={{
          fontFamily: "'Cinzel Decorative', serif",
          fontSize: "clamp(14px, 1.5vw, 24px)",
          color: "#e0d5c0", letterSpacing: "2px", margin: 0,
          textShadow: "0 0 20px rgba(212,175,55,0.2)",
        }}>Commander Tracker</h1>
        <div style={{ display: "flex", gap: "0.5vw" }}>
          <button onClick={resetGame} style={{
            padding: "0.4vh 1vw", borderRadius: "6px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)",
            cursor: "pointer", fontSize: "clamp(10px, 0.9vw, 14px)",
            fontFamily: "'Quattrocento', serif",
          }}>Reset Counters</button>
          <button onClick={newGame} style={{
            padding: "0.4vh 1vw", borderRadius: "6px",
            border: "1px solid rgba(212,175,55,0.3)",
            background: "rgba(212,175,55,0.1)", color: "#d4af37",
            cursor: "pointer", fontSize: "clamp(10px, 0.9vw, 14px)",
            fontFamily: "'Quattrocento', serif",
          }}>New Game</button>
        </div>
      </div>

      {/* Player Grid */}
      <div style={{
        display: "grid",
        ...getGridStyle(players.length, layout),
        gap: "2px",
        flex: 1,
        width: "100%",
        minHeight: 0,
      }}>
        {players.map((player) => (
          <PlayerPanel
            key={player.index}
            player={player}
            allPlayers={players}
            onUpdate={(updates) => updatePlayer(player.index, updates)}
            onDamageChange={(fromIndex, value) =>
              updateCommanderDamage(player.index, fromIndex, value)
            }
            onCommitDelta={(delta) => commitLifeDelta(player.index, delta)}
          />
        ))}
      </div>
    </div>
  );
}