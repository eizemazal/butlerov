export function format_charge(charge: number) : string {
    if (charge == 0)
        return "";
    if (charge == 1)
        return "+";
    if (charge == -1)
        return "–";
    return `${charge}`;
}
