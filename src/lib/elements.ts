class ChemicalElement {
    symbol: string;
    name: string;
    n: number;
    atomic_mass: number;
    valences: Array<number>;

    constructor(symbol: string, name: string, n: number, atomic_mass: number, valences: Array<number>) {
        this.symbol = symbol;
        this.name = name;
        this.n = n;
        this.atomic_mass = atomic_mass;
        this.valences = valences;
    }
    /**
     * Suggest default implicit hydrogen count for atom of this element having specified number of valent bonds and charge
     * @param n_valent_bonds number of valent bonds
     * @param charge charge on atom
     */
    get_h_count(n_valent_bonds: number, charge: number): number {
        if (["B", "Al", "Ga", "In"].indexOf(this.symbol) != -1 && charge == -1)
            return n_valent_bonds <= 4 ? 4 - n_valent_bonds : 0;
        if (["N", "P", "As"].indexOf(this.symbol) != -1 && charge == 1)
            return n_valent_bonds <= 4 ? 4 - n_valent_bonds : 0;
        for (const valency of this.valences) {
            if (valency >= n_valent_bonds + Math.abs(charge)) {
                return valency - n_valent_bonds - Math.abs(charge);
            }
        }
        return 0;
    }
}

const ChemicalElements: { [key: string] :  ChemicalElement } = {
    "H": new ChemicalElement("H", "Hydrogen", 1, 1.00794, [1]),
    "He": new ChemicalElement("He", "Helium", 2, 4.002602, []),
    "Li": new ChemicalElement("Li", "Lithium", 3, 6.941, [1]),
    "Be": new ChemicalElement("Be", "Beryllium", 4, 9.012182, [2]),
    "B": new ChemicalElement("B", "Boron", 5, 10.811, [3]),
    "C": new ChemicalElement("C", "Carbon", 6, 12.011, [4]),
    "N": new ChemicalElement("N", "Nitrogen", 7, 14.00674, [3]),
    "O": new ChemicalElement("O", "Oxygen", 8, 15.9994, [2]),
    "F": new ChemicalElement("F", "Fluorine", 9, 18.9984032, [1]),
    "Ne": new ChemicalElement("Ne", "Neon", 10, 20.1797, []),
    "Na": new ChemicalElement("Na", "Sodium", 11, 22.989768, [1]),
    "Mg": new ChemicalElement("Mg", "Magnesium", 12, 24.305, [2]),
    "Al": new ChemicalElement("Al", "Aluminum", 13, 26.981539, [3]),
    "Si": new ChemicalElement("Si", "Silicon", 14, 28.0855, [4]),
    "P": new ChemicalElement("P", "Phosphorus", 15, 30.973762, [3,5]),
    "S": new ChemicalElement("S", "Sulfur", 16, 32.066, [2,4,6]),
    "Cl": new ChemicalElement("Cl", "Chlorine", 17, 35.4527, [1,3,4,5,7]),
    "Ar": new ChemicalElement("Ar", "Argon", 18, 39.948, [2]),
    "K": new ChemicalElement("K", "Potassium", 19, 39.0983, [1]),
    "Ca": new ChemicalElement("Ca", "Calcium", 20, 40.078, [2]),
    "Sc": new ChemicalElement("Sc", "Scandium", 21, 44.95591, [3]),
    "Ti": new ChemicalElement("Ti", "Titanium", 22, 47.88, [2,3,4]),
    "V": new ChemicalElement("V", "Vanadium", 23, 50.9415, [2,3,4,5]),
    "Cr": new ChemicalElement("Cr", "Chromium", 24, 51.9961, [2,3,6]),
    "Mn": new ChemicalElement("Mn", "Manganese", 25, 54.93805, [1,2,3,4,6,7]),
    "Fe": new ChemicalElement("Fe", "Iron", 26, 55.847, [2,3,4,6]),
    "Co": new ChemicalElement("Co", "Cobalt", 27, 58.9332, [2,3]),
    "Ni": new ChemicalElement("Ni", "Nickel", 28, 58.6934, [2,3]),
    "Cu": new ChemicalElement("Cu", "Copper", 29, 63.546, [1,2]),
    "Zn": new ChemicalElement("Zn", "Zinc", 30, 65.39, [2]),
    "Ga": new ChemicalElement("Ga", "Gallium", 31, 69.723, [3]),
    "Ge": new ChemicalElement("Ge", "Germanium", 32, 72.61, [2,4]),
    "As": new ChemicalElement("As", "Arsenic", 33, 74.92159, [3,5]),
    "Se": new ChemicalElement("Se", "Selenium", 34, 78.96, [2,4,6]),
    "Br": new ChemicalElement("Br", "Bromine", 35, 79.904, [1,3,5,7]),
    "Kr": new ChemicalElement("Kr", "Krypton", 36, 83.8, [2]),
    "Rb": new ChemicalElement("Rb", "Rubidium", 37, 85.4678, [1]),
    "Sr": new ChemicalElement("Sr", "Strontium", 38, 87.62, [2]),
    "Y": new ChemicalElement("Y", "Yttrium", 39, 88.90585, [3]),
    "Zr": new ChemicalElement("Zr", "Zirconium", 40, 91.224, [2,3,4]),
    "Nb": new ChemicalElement("Nb", "Niobium", 41, 92.90638, [2,3,5]),
    "Mo": new ChemicalElement("Mo", "Molybdenum", 42, 95.94, [2,3,4,5,6]),
    "Tc": new ChemicalElement("Tc", "Technetium", 43, 97.9072, [2,4,5,6,7]),
    "Ru": new ChemicalElement("Ru", "Ruthenium", 44, 101.07, [1,2,3,4,5,6,7,8]),
    "Rh": new ChemicalElement("Rh", "Rhodium", 45, 102.9055, [2,3,4,5]),
    "Pd": new ChemicalElement("Pd", "Palladium", 46, 106.42, [2,4]),
    "Ag": new ChemicalElement("Ag", "Silver", 47, 107.8682, [1,2]),
    "Cd": new ChemicalElement("Cd", "Cadmium", 48, 112.411, [2]),
    "In": new ChemicalElement("In", "Indium", 49, 114.818, [1,3]),
    "Sn": new ChemicalElement("Sn", "Tin", 50, 118.71, [2,3]),
    "Sb": new ChemicalElement("Sb", "Antimony", 51, 121.757, [3,5]),
    "Te": new ChemicalElement("Te", "Tellurium", 52, 127.6, [2,4,6]),
    "I": new ChemicalElement("I", "Iodine", 53, 126.90447, [1,3,5,7]),
    "Xe": new ChemicalElement("Xe", "Xenon", 54, 131.29, [2,4,6]),
    "Cs": new ChemicalElement("Cs", "Cesium", 55, 132.90543, [1]),
    "Ba": new ChemicalElement("Ba", "Barium", 56, 137.327, [2]),
    "La": new ChemicalElement("La", "Lanthanum", 57, 138.9055, [3]),
    "Ce": new ChemicalElement("Ce", "Cerium", 58, 140.115, [3,4]),
    "Pr": new ChemicalElement("Pr", "Praseodymium", 59, 140.90765, [3,4]),
    "Nd": new ChemicalElement("Nd", "Neodymium", 60, 144.24, [3]),
    "Pm": new ChemicalElement("Pm", "Promethium", 61, 144.9127, [3]),
    "Sm": new ChemicalElement("Sm", "Samarium", 62, 150.36, [2,3]),
    "Eu": new ChemicalElement("Eu", "Europium", 63, 151.965, [2,3]),
    "Gd": new ChemicalElement("Gd", "Gadolinium", 64, 157.25, [3]),
    "Tb": new ChemicalElement("Tb", "Terbium", 65, 158.92534, [3,4]),
    "Dy": new ChemicalElement("Dy", "Dysprosium", 66, 162.5, [3]),
    "Ho": new ChemicalElement("Ho", "Holmium", 67, 164.93032, [3]),
    "Er": new ChemicalElement("Er", "Erbium", 68, 167.26, [3]),
    "Tm": new ChemicalElement("Tm", "Thulium", 69, 168.93421, [3]),
    "Yb": new ChemicalElement("Yb", "Ytterbium", 70, 173.04, [2,3]),
    "Lu": new ChemicalElement("Lu", "Lutetium", 71, 174.967, [3]),
    "Hf": new ChemicalElement("Hf", "Hafnium", 72, 178.49, [4]),
    "Ta": new ChemicalElement("Ta", "Tantalum", 73, 180.9479, [3,5]),
    "W": new ChemicalElement("W", "Tungsten", 74, 183.84, [2,3,4,5,6]),
    "Re": new ChemicalElement("Re", "Rhenium", 75, 186.207, [1,2,3,4,5,6,7]),
    "Os": new ChemicalElement("Os", "Osmium", 76, 190.23, [3,4,6,8]),
    "Ir": new ChemicalElement("Ir", "Iridium", 77, 192.22, [2,3,4,5,6,7,8]),
    "Pt": new ChemicalElement("Pt", "Platinum", 78, 195.08, [2,4]),
    "Au": new ChemicalElement("Au", "Gold", 79, 196.96654, [1,3]),
    "Hg": new ChemicalElement("Hg", "Mercury", 80, 200.59, [2]),
    "Tl": new ChemicalElement("Tl", "Thallium", 81, 204.3833, [1,3]),
    "Pb": new ChemicalElement("Pb", "Lead", 82, 207.2, [2,4]),
    "Bi": new ChemicalElement("Bi", "Bismuth", 83, 208.98037, [3,5]),
    "Po": new ChemicalElement("Po", "Polonium", 84, 208.9824, [2,4,6]),
    "At": new ChemicalElement("At", "Astatine", 85, 209.9871, [1,3,5,7]),
    "Rn": new ChemicalElement("Rn", "Radon", 86, 222.0176, [2,4,6]),
    "Fr": new ChemicalElement("Fr", "Francium", 87, 223.0197, [1]),
    "Ra": new ChemicalElement("Ra", "Radium", 88, 226.0254, [2]),
    "Ac": new ChemicalElement("Ac", "Actinium", 89, 227.0278, [3]),
    "Th": new ChemicalElement("Th", "Thorium", 90, 232.0381, [4]),
    "Pa": new ChemicalElement("Pa", "Protactinium", 91, 231.03588, [4,5]),
    "U": new ChemicalElement("U", "Uranium", 92, 238.0289, [2,3,4,5,6]),
    "Np": new ChemicalElement("Np", "Neptunium", 93, 237.0482, [3,4,5,6]),
    "Pu": new ChemicalElement("Pu", "Plutonium", 94, 244.0642, [3,4,5,6]),
    "Am": new ChemicalElement("Am", "Americium", 95, 243.0614, [2,3,4,5,6]),
    "Cm": new ChemicalElement("Cm", "Curium", 96, 247.0703, [3,4]),
    "Bk": new ChemicalElement("Bk", "Berkelium", 97, 247.0703, [3,4]),
    "Cf": new ChemicalElement("Cf", "Californium", 98, 251.0796, [3]),
    "Es": new ChemicalElement("Es", "Einsteinium", 99, 252.083, [3]),
    "Fm": new ChemicalElement("Fm", "Fermium", 100, 257.0951, [3]),
    "Md": new ChemicalElement("Md", "Mendelevium", 101, 258.0984, [3]),
    "No": new ChemicalElement("Md", "Nobelium", 102, 258.0984, [3]),
    "Lr": new ChemicalElement("Lr", "Lawrencium", 103, 262.1098, [3]),
};

export {ChemicalElement, ChemicalElements};