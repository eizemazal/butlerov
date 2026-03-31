import { MW, Formula } from "../src/descriptor/mw";
import { SmilesConverter } from "../src/main";


test.each(
    [
        ["CC(=O)C", 58.08, "C3H6O", "C<sub>3</sub>H<sub>6</sub>O"],
        //["c1ccccc1", 78.11, "C6H6"],
        ["[Li]CCCC", 64.06, "C4H9Li", "C<sub>4</sub>H<sub>9</sub>Li"],
        ["FC(F)(F)C(=O)Cl", 132.47, "C2ClF3O", "C<sub>2</sub>ClF<sub>3</sub>O"],
        ["CCCC[N+](CCCC)(CCCC)CCCC[Br-]", 322.37, "C16H36BrN", "C<sub>16</sub>H<sub>36</sub>BrN"],
        ["[CH3+]", 15.03, "CH3+", "CH<sub>3</sub><sup>+</sup>"],
        ["[CH3-]", 15.03, "CH3-", "CH<sub>3</sub><sup>-</sup>"],
        ["[N+2](C)(C)(C)C", 74.15, "C4H12N(2+)", "C<sub>4</sub>H<sub>12</sub>N<sup>2+</sup>"],
        ["[O-][N+]([O-])=O", 62.00, "NO3-", "NO<sub>3</sub><sup>-</sup>"],
    ]
)("Test molecular weight and brutto formula computation, from SMILES", (smiles, expected_mw, expected_formula, expected_html) => {
    const graph = new SmilesConverter().graph_from_string(smiles);
    expect(new MW(graph).compute()).toBeCloseTo(expected_mw, 2);
    expect(new Formula(graph).compute_as_string()).toBe(expected_formula);
    expect(new Formula(graph).compute_as_html()).toBe(expected_html);
});