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
    const superscriptMap: { [key: string] :  number } = {
        '0': 0x2070,
        '1': 0x00B9,
        '2': 0x00B2,
        '3': 0x00B3,
        '4': 0x2074,
        '5': 0x2075,
        '6': 0x2076,
        '7': 0x2077,
        '8': 0x2078,
        '9': 0x2079,
        '+': 0x207A,
        '-': 0x207B
    };
    for (let i = 0; i < s.length; i++) {
        r += String.fromCodePoint(superscriptMap[s[i]]);
    }
    return r;
}

function charge_to_superscript(charge: number): string {
    const superscriptSign: { [key: string] :  number } = {
        '+': 0x207A,
        '-': 0x207B
    };
    if (charge == 1)
        return String.fromCodePoint(superscriptSign["+"]);
    if (charge == -1)
        return String.fromCodePoint(superscriptSign["-"]);
    if (charge > 0)
        return int_to_superscript(charge) + String.fromCodePoint(superscriptSign["+"]);
    if (charge < 0)
        return int_to_superscript(-charge) + String.fromCodePoint(superscriptSign["-"]);
    return "";
}

export {int_to_subscript, int_to_superscript, charge_to_superscript};