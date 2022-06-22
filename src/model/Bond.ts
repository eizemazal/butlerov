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

enum StereoType {
    Default = 0,
    Up = 1,
    Either = 4,
    Down = 6,
}

class Bond {
    bond_type: BondType;
    stereo: StereoType;
    constructor(bond_type = BondType.Single) {
        this.bond_type = bond_type;
        this.stereo = StereoType.Default;
    }
}

export { Bond, BondType, StereoType };