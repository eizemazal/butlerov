// this is taken from Mol file specifiction, and parsing mol files relies on this
enum BondType {
    Single = 1,
    Double,
    Triple,
    Aromatic,
    Single_or_Double,
    Single_or_Aromatic,
    Double_or_Aromatic,
    Any
}

class Bond {
    bond_type: BondType;
    constructor(bond_type: BondType) {
        this.bond_type = bond_type;
    }
}

export { Bond, BondType };