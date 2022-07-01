import { charge_to_superscript, int_to_subscript, int_to_superscript } from "../src/lib/indices";

test("Int to subscript", () => {
    expect(int_to_subscript(21345678903)).toBe("₂₁₃₄₅₆₇₈₉₀₃");
});

test("Int to superscript", () => {
    expect(int_to_superscript(1234567809)).toBe("¹²³⁴⁵⁶⁷⁸⁰⁹");
});

test("Charge to superscript", () =>{
    expect(charge_to_superscript(-1)).toBe("⁻");
    expect(charge_to_superscript(1)).toBe("⁺");
    expect(charge_to_superscript(3)).toBe("³⁺");
    expect(charge_to_superscript(-2)).toBe("²⁻");
});