export class Abbreviation {
    symbol: string;
    names: string[];
    smiles: string;


    constructor(symbol: string, names: string[], smiles: string) {
        this.symbol = symbol;
        this.names = names;
        this.smiles = smiles;
    }

}

export const Abbreviations: { [key: string] :  Abbreviation } = {
    // aliphatic groups
    "Me": new Abbreviation("Me", ["Methyl"], "C"),
    "Et": new Abbreviation("Et", ["Ethyl"], "CC"),
    "Pr": new Abbreviation("Pr", ["Propyl"], "CCC"),
    "i-Pr": new Abbreviation("Pr", ["Propyl"], "C(C)C"),
    "Bu": new Abbreviation("Bu", ["Butyl"], "CCCC"),
    "i-Bu": new Abbreviation("i-Bu", ["iso-Butyl"], "CC(C)C"),
    "s-Bu": new Abbreviation("s-Bu", ["sec-Butyl"], "C(C)CC"),
    "t-Bu": new Abbreviation("t-Bu", ["tert-Butyl"], "C(C)(C)C"),
    "Am": new Abbreviation("Am", ["Amyl"], "CCCCC"),
    "i-Am": new Abbreviation("Am", ["Amyl"], "CCC(C)C"),
    "Hex": new Abbreviation("Hex", ["Hexyl"], "CCCCCC"),
    "All": new Abbreviation("All", ["Allyl"], "CC=C"),
    // aromatic groups
    "Ph": new Abbreviation("Ph", ["Phenyl"], "c1ccccc1"),
    "Tol": new Abbreviation("Tol", ["Tolyl"], "c1ccc(C)cc1"),
    "Bn": new Abbreviation("Bn", ["Benzyl"], "Cc1ccccc1"),
    // acyl groups
    "Ac": new Abbreviation("Ac", ["Acetyl"], "C(=O)C"),
    "Bz": new Abbreviation("Bz", ["Benzoyl"], "C(=O)c1ccccc1"),
    // organoelement: phosphorus
    "CEP": new Abbreviation("CEP", ["Cyanoethyldiisopropylaminophosphamidite"], "P(OCCC#N)N(C(C)C)C(C)C"),
    // organoelement: silicon
    "TBDMS": new Abbreviation("TBDMS", ["tert-Butyldimethylsilyl"], "[Si](C)(C)C(C)(C)C"),
    "TMS": new Abbreviation("TMS", ["Trimethylsilyl"], "[Si](C)(C)C"),
    // protective groups: carbamate
    "Boc": new Abbreviation("Boc", ["tert-Butoxycarbonyl"], "C(=O)OC(C)(C)C"),
    // protective groups: ethers
    "THP": new Abbreviation("THP", ["Tetrahydropyranyl"], "C1OCCCC1"),
    // protective groups: trityl
    "Tr": new Abbreviation("Tr", ["Trityl"], "C(c1ccccc1)(c1ccccc1)(c1ccccc1)"),
    "MMT": new Abbreviation("MMT", ["Monomethoxytrityl"], "C(c1ccccc1)(c1ccccc1)(c1ccc(OC)cc1)"),
    "DMT": new Abbreviation("DMT", ["Dimethoxytrityl"], "C(c1ccccc1)(c1ccc(OC)cc1)(c1ccc(OC)cc1)"),
    // sulfonyl groups
    "Ms": new Abbreviation("Ms", ["Mesyl"], "S(=O)(=O)C"),
    "Ns": new Abbreviation("Ns", ["Nosyl"], "S(=O)(=O)c1ccc([N+](=O)[O-])cc1"),
    "Tf": new Abbreviation("Tf", ["Triflyl"], "S(=O)(=O)C(F)(F)F"),
    "Ts": new Abbreviation("Ts", ["Tosyl"], "S(=O)(=O)c1ccc(C)cc1"),
};
