function int_to_subscript(int: number): string {
    let r = "";
    const s = `${int}`;
    for (let i = 0; i < s.length; i++) {
        const char_code = s.charCodeAt(i);
        r += String.fromCodePoint(char_code + 8272);
    }
    return r;
}

function int_to_superscript(int: number): string {
    let r = "";
    const s = `${int}`;
    const from = "0123456789-";
    const to = "⁰¹²³⁴⁵⁶⁷⁸⁹⁻";
    for (let i = 0; i < s.length; i++) {
        const idx = from.indexOf(s[i]);
        if (idx != -1)
            r += to[idx];
    }
    return r;
}

function charge_to_superscript(charge: number): string {
    if (charge == 1)
        return "⁺";
    if (charge == -1)
        return "⁻";
    if (charge > 0)
        return int_to_superscript(charge) + "⁺";
    if (charge < 0)
        return int_to_superscript(-charge) + "⁻";
    return "";
}

export {int_to_subscript, int_to_superscript, charge_to_superscript};