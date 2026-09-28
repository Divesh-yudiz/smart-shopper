import config from './config.js';

export const CAUSE_LETTER_SPACING = 0.4;

/** Map CSS keywords / Phaser fontStyle values onto Cause @font-face weights. */
export function causeFontWeight (fontStyle) {
    if (fontStyle == null || fontStyle === '') return '400';
    const raw = String(fontStyle).toLowerCase().trim();
    if (raw === 'normal' || raw === 'regular') return '400';
    if (raw === 'bold') return '700';
    if (raw === 'bolder') return '800';
    if (raw.includes('bold') && raw.includes('italic')) return '700';
    if (/^[1-9]00$/.test(raw)) return raw;
    return String(fontStyle);
}

/** Cause's space glyph is near-zero width — swap in en-spaces so words stay readable. */
export function copyCause (s) {
    return String(s ?? '').replace(/ /g, '\u2002');
}

export function causeStyle (style = {}) {
    const { fontFamily: _ignored, fontStyle, fontWeight, ...rest } = style;
    return {
        letterSpacing: CAUSE_LETTER_SPACING,
        ...rest,
        fontFamily: config.fonts.text,
        // Phaser builds `"${fontStyle} ${fontSize} ${fontFamily}"` — numeric
        // weights match the Cause @font-face declarations in index.css.
        fontStyle: causeFontWeight(fontWeight ?? fontStyle),
    };
}

export function addCauseText (scene, x, y, message, style = {}) {
    return scene.add.text(x, y, copyCause(message), causeStyle(style));
}

export function setCauseText (text, message) {
    text.setText(copyCause(message));
    return text;
}

/** Wrap on real spaces, then swap in en-spaces so Cause still shows gaps. */
export function wrapCause (scene, str, maxWidth, style = {}) {
    const words = String(str ?? '').split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    const probe = scene.add.text(0, 0, '', causeStyle(style)).setVisible(false);
    const widthOf = (s) => {
        probe.setText(copyCause(s));
        return probe.width;
    };
    const lines = [];
    let line = '';
    words.forEach((word) => {
        const trial = line ? `${line} ${word}` : word;
        if (line && widthOf(trial) > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = trial;
        }
    });
    if (line) lines.push(line);
    probe.destroy();
    return lines.join('\n');
}
