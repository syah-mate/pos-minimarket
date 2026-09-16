// Renders shared receipt ops (see layout.js) into raw ESC/POS bytes.
// Used by the BLE transport, which must receive a Buffer of ESC/POS — never
// HTML/PDF and never webContents.print().

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const ALIGN = { lt: 0, ct: 1, rt: 2 };

// cp850/latin1 covers ASCII + common accented chars; POS text is mostly ASCII.
function encodeText(s) {
  return Buffer.from(String(s == null ? "" : s), "latin1");
}

function opsToBytes(ops) {
  const parts = [];
  // Initialize printer: ESC @
  parts.push(Buffer.from([ESC, 0x40]));
  // Select character code table PC850 (Multilingual): ESC t 2
  parts.push(Buffer.from([ESC, 0x74, 2]));

  for (const o of ops) {
    switch (o.op) {
      case "align":
        parts.push(Buffer.from([ESC, 0x61, ALIGN[o.v] ?? 0]));
        break;
      case "style": // bold on/off: ESC E n
        parts.push(Buffer.from([ESC, 0x45, o.bold ? 1 : 0]));
        break;
      case "size": {
        // GS ! n — high nibble = width mult, low nibble = height mult (0..7)
        const w = o.w ? 1 : 0;
        const h = o.h ? 1 : 0;
        parts.push(Buffer.from([GS, 0x21, (w << 4) | h]));
        break;
      }
      case "text":
        parts.push(encodeText(o.s), Buffer.from([LF]));
        break;
      case "feed":
        parts.push(Buffer.from(new Array(Math.max(1, o.n || 1)).fill(LF)));
        break;
      case "cashdraw": // ESC p m t1 t2 (pin 0 -> connector 2, pin 1 -> 5)
        parts.push(Buffer.from([ESC, 0x70, o.pin === 5 ? 1 : 0, 25, 250]));
        break;
      case "cut": // feed a little then full cut: GS V 66 0
        parts.push(Buffer.from([LF, LF, LF]));
        parts.push(Buffer.from([GS, 0x56, 66, 0]));
        break;
      default:
        break;
    }
  }
  return Buffer.concat(parts);
}

module.exports = { opsToBytes };
