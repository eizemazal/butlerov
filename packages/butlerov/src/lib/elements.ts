class ChemicalElement {
    symbol: string;
    name: string;
    n: number;
    atomic_mass: number;
    valences: number[];
    abundance: number;
    isotopes: number[];



    /**
     * Create instance of chemical element
     * @param symbol Symbol of chemical element, e.g. Na
     * @param name Name of chemical element in English, e.g. Sodium
     * @param n Atomic number
     * @param atomic_mass Average mass
     * @param valences Common valencies. Used to predict number of implicit hydrogens during drawing.
     * @param abundance Abundance of element on drawings. This is purely speculative but useful for optimal user experience
     */
    constructor(symbol: string, name: string, n: number, atomic_mass: number, valences: number[], abundance: number, isotopes: number[]) {
        this.symbol = symbol;
        this.name = name;
        this.n = n;
        this.atomic_mass = atomic_mass;
        this.valences = valences;
        this.abundance = abundance;
        this.isotopes = isotopes;
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

const ChemicalElements: Record<string, ChemicalElement> = {
    "H": new ChemicalElement("H", "Hydrogen", 1, 1.00794, [1], 1, [1, 2, 3]),
    "He": new ChemicalElement("He", "Helium", 2, 4.002602, [], 4, [3, 4]),
    "Li": new ChemicalElement("Li", "Lithium", 3, 6.941, [1], 2, [6, 7]),
    "Be": new ChemicalElement("Be", "Beryllium", 4, 9.012182, [2], 4, []),
    "B": new ChemicalElement("B", "Boron", 5, 10.811, [3], 2, [10, 11]),
    "C": new ChemicalElement("C", "Carbon", 6, 12.011, [4], 1, [12, 13, 14]),
    "N": new ChemicalElement("N", "Nitrogen", 7, 14.00674, [3], 1, [14, 15]),
    "O": new ChemicalElement("O", "Oxygen", 8, 15.9994, [2], 1, [16, 17, 18]),
    "F": new ChemicalElement("F", "Fluorine", 9, 18.9984032, [1], 1, [18, 19]),
    "Ne": new ChemicalElement("Ne", "Neon", 10, 20.1797, [], 4, [20, 21, 22]),
    "Na": new ChemicalElement("Na", "Sodium", 11, 22.989768, [1], 2, []),
    "Mg": new ChemicalElement("Mg", "Magnesium", 12, 24.305, [2], 2, [24, 25, 26]),
    "Al": new ChemicalElement("Al", "Aluminum", 13, 26.981539, [3], 2, []),
    "Si": new ChemicalElement("Si", "Silicon", 14, 28.0855, [4], 2, [28, 29, 30]),
    "P": new ChemicalElement("P", "Phosphorus", 15, 30.973762, [3, 5], 1, [31, 32]),
    "S": new ChemicalElement("S", "Sulfur", 16, 32.066, [2, 4, 6], 1, [32, 33, 34, 36]),
    "Cl": new ChemicalElement("Cl", "Chlorine", 17, 35.4527, [1, 3, 4, 5, 7], 1, [35, 37]),
    "Ar": new ChemicalElement("Ar", "Argon", 18, 39.948, [2], 4, [36, 38, 40]),
    "K": new ChemicalElement("K", "Potassium", 19, 39.0983, [1], 2, [39, 40, 41]),
    "Ca": new ChemicalElement("Ca", "Calcium", 20, 40.078, [2], 2, [40, 42, 43, 44, 46, 48]),
    "Sc": new ChemicalElement("Sc", "Scandium", 21, 44.95591, [3], 4, []),
    "Ti": new ChemicalElement("Ti", "Titanium", 22, 47.88, [2, 3, 4], 3, [46, 47, 48, 49, 50]),
    "V": new ChemicalElement("V", "Vanadium", 23, 50.9415, [2, 3, 4, 5], 3, [50, 51]),
    "Cr": new ChemicalElement("Cr", "Chromium", 24, 51.9961, [2, 3, 6], 3, [50, 52, 53, 54]),
    "Mn": new ChemicalElement("Mn", "Manganese", 25, 54.93805, [1, 2, 3, 4, 6, 7], 3, []),
    "Fe": new ChemicalElement("Fe", "Iron", 26, 55.847, [2, 3, 4, 6], 3, [54, 56, 57, 58]),
    "Co": new ChemicalElement("Co", "Cobalt", 27, 58.9332, [2, 3], 3, []),
    "Ni": new ChemicalElement("Ni", "Nickel", 28, 58.6934, [2, 3], 3, [58, 60, 61, 62, 64]),
    "Cu": new ChemicalElement("Cu", "Copper", 29, 63.546, [1, 2], 2, [63, 65]),
    "Zn": new ChemicalElement("Zn", "Zinc", 30, 65.39, [2], 2, [64, 66, 67, 68, 70]),
    "Ga": new ChemicalElement("Ga", "Gallium", 31, 69.723, [3], 4, [69, 71]),
    "Ge": new ChemicalElement("Ge", "Germanium", 32, 72.61, [2, 4], 4, [70, 72, 73, 74, 76]),
    "As": new ChemicalElement("As", "Arsenic", 33, 74.92159, [3, 5], 2, []),
    "Se": new ChemicalElement("Se", "Selenium", 34, 78.96, [2, 4, 6], 3, [74, 76, 77, 78, 80, 82]),
    "Br": new ChemicalElement("Br", "Bromine", 35, 79.904, [1, 3, 5, 7], 1, [79, 81]),
    "Kr": new ChemicalElement("Kr", "Krypton", 36, 83.8, [2], 4, [78, 80, 82, 83, 84, 86]),
    "Rb": new ChemicalElement("Rb", "Rubidium", 37, 85.4678, [1], 4, [85, 87]),
    "Sr": new ChemicalElement("Sr", "Strontium", 38, 87.62, [2], 4, [84, 86, 87, 88]),
    "Y": new ChemicalElement("Y", "Yttrium", 39, 88.90585, [3], 4, []),
    "Zr": new ChemicalElement("Zr", "Zirconium", 40, 91.224, [2, 3, 4], 4, [90, 91, 92, 94, 96]),
    "Nb": new ChemicalElement("Nb", "Niobium", 41, 92.90638, [2, 3, 5], 4, []),
    "Mo": new ChemicalElement("Mo", "Molybdenum", 42, 95.94, [2, 3, 4, 5, 6], 4, [92, 94, 95, 96, 97, 98, 100]),
    "Tc": new ChemicalElement("Tc", "Technetium", 43, 97.9072, [2, 4, 5, 6, 7], 5, [98, 99]),
    "Ru": new ChemicalElement("Ru", "Ruthenium", 44, 101.07, [1, 2, 3, 4, 5, 6, 7, 8], 3, [96, 98, 99, 100, 101, 102, 104]),
    "Rh": new ChemicalElement("Rh", "Rhodium", 45, 102.9055, [2, 3, 4, 5], 3, []),
    "Pd": new ChemicalElement("Pd", "Palladium", 46, 106.42, [2, 4], 3, [102, 104, 105, 106, 108, 110]),
    "Ag": new ChemicalElement("Ag", "Silver", 47, 107.8682, [1, 2], 3, [107, 109]),
    "Cd": new ChemicalElement("Cd", "Cadmium", 48, 112.411, [2], 3, [106, 108, 110, 111, 112, 113, 114, 116]),
    "In": new ChemicalElement("In", "Indium", 49, 114.818, [1, 3], 4, [113, 115]),
    "Sn": new ChemicalElement("Sn", "Tin", 50, 118.71, [2, 3], 3, [112, 114, 115, 116, 117, 118, 119, 120, 122, 124]),
    "Sb": new ChemicalElement("Sb", "Antimony", 51, 121.757, [3, 5], 4, [121, 123]),
    "Te": new ChemicalElement("Te", "Tellurium", 52, 127.6, [2, 4, 6], 3, [120, 122, 123, 124, 125, 126, 128, 130]),
    "I": new ChemicalElement("I", "Iodine", 53, 126.90447, [1, 3, 5, 7], 1, []),
    "Xe": new ChemicalElement("Xe", "Xenon", 54, 131.29, [2, 4, 6], 4, [124, 126, 128, 129, 130, 131, 132, 134, 136]),
    "Cs": new ChemicalElement("Cs", "Cesium", 55, 132.90543, [1], 4, []),
    "Ba": new ChemicalElement("Ba", "Barium", 56, 137.327, [2], 4, [130, 132, 134, 135, 136, 137, 138]),
    "La": new ChemicalElement("La", "Lanthanum", 57, 138.9055, [3], 4, [138, 139]),
    "Ce": new ChemicalElement("Ce", "Cerium", 58, 140.115, [3, 4], 3, [136, 138, 140, 142]),
    "Pr": new ChemicalElement("Pr", "Praseodymium", 59, 140.90765, [3, 4], 4, []),
    "Nd": new ChemicalElement("Nd", "Neodymium", 60, 144.24, [3], 4, [142, 143, 144, 145, 146, 148, 150]),
    "Pm": new ChemicalElement("Pm", "Promethium", 61, 144.9127, [3], 5, []),
    "Sm": new ChemicalElement("Sm", "Samarium", 62, 150.36, [2, 3], 4, [144, 147, 148, 149, 150, 152, 154]),
    "Eu": new ChemicalElement("Eu", "Europium", 63, 151.965, [2, 3], 3, [151, 153]),
    "Gd": new ChemicalElement("Gd", "Gadolinium", 64, 157.25, [3], 4, [152, 154, 155, 156, 157, 158, 160]),
    "Tb": new ChemicalElement("Tb", "Terbium", 65, 158.92534, [3, 4], 4, []),
    "Dy": new ChemicalElement("Dy", "Dysprosium", 66, 162.5, [3], 4, [156, 158, 160, 161, 162, 163, 164]),
    "Ho": new ChemicalElement("Ho", "Holmium", 67, 164.93032, [3], 4, []),
    "Er": new ChemicalElement("Er", "Erbium", 68, 167.26, [3], 4, [162, 164, 166, 167, 168, 170]),
    "Tm": new ChemicalElement("Tm", "Thulium", 69, 168.93421, [3], 4, []),
    "Yb": new ChemicalElement("Yb", "Ytterbium", 70, 173.04, [2, 3], 4, [168, 170, 171, 172, 173, 174, 176]),
    "Lu": new ChemicalElement("Lu", "Lutetium", 71, 174.967, [3], 4, [175, 176]),
    "Hf": new ChemicalElement("Hf", "Hafnium", 72, 178.49, [4], 4, [174, 176, 177, 178, 179, 180]),
    "Ta": new ChemicalElement("Ta", "Tantalum", 73, 180.9479, [3, 5], 4, []),
    "W": new ChemicalElement("W", "Tungsten", 74, 183.84, [2, 3, 4, 5, 6], 4, [180, 182, 183, 184, 186]),
    "Re": new ChemicalElement("Re", "Rhenium", 75, 186.207, [1, 2, 3, 4, 5, 6, 7], 4, [185, 187]),
    "Os": new ChemicalElement("Os", "Osmium", 76, 190.23, [3, 4, 6, 8], 3, [184, 186, 187, 188, 189, 190, 192]),
    "Ir": new ChemicalElement("Ir", "Iridium", 77, 192.22, [2, 3, 4, 5, 6, 7, 8], 3, [191, 193]),
    "Pt": new ChemicalElement("Pt", "Platinum", 78, 195.08, [2, 4], 3, [190, 192, 194, 195, 196, 198]),
    "Au": new ChemicalElement("Au", "Gold", 79, 196.96654, [1, 3], 3, []),
    "Hg": new ChemicalElement("Hg", "Mercury", 80, 200.59, [2], 3, [196, 198, 199, 200, 201, 202, 204]),
    "Tl": new ChemicalElement("Tl", "Thallium", 81, 204.3833, [1, 3], 3, [203, 205]),
    "Pb": new ChemicalElement("Pb", "Lead", 82, 207.2, [2, 4], 3, [204, 206, 207, 208]),
    "Bi": new ChemicalElement("Bi", "Bismuth", 83, 208.98037, [3, 5], 4, []),
    "Po": new ChemicalElement("Po", "Polonium", 84, 208.9824, [2, 4, 6], 5, [208, 209, 210]),
    "At": new ChemicalElement("At", "Astatine", 85, 209.9871, [1, 3, 5, 7], 5, []),
    "Rn": new ChemicalElement("Rn", "Radon", 86, 222.0176, [2, 4, 6], 5, [211, 220]),
    "Fr": new ChemicalElement("Fr", "Francium", 87, 223.0197, [1], 5, []),
    "Ra": new ChemicalElement("Ra", "Radium", 88, 226.0254, [2], 5, [226, 228]),
    "Ac": new ChemicalElement("Ac", "Actinium", 89, 227.0278, [3], 5, []),
    "Th": new ChemicalElement("Th", "Thorium", 90, 232.0381, [4], 5, [230, 232]),
    "Pa": new ChemicalElement("Pa", "Protactinium", 91, 231.03588, [4, 5], 5, []),
    "U": new ChemicalElement("U", "Uranium", 92, 238.0289, [2, 3, 4, 5, 6], 4, [234, 235, 238]),
    "Np": new ChemicalElement("Np", "Neptunium", 93, 237.0482, [3, 4, 5, 6], 5, []),
    "Pu": new ChemicalElement("Pu", "Plutonium", 94, 244.0642, [3, 4, 5, 6], 5, [238, 239, 240, 241, 242, 244]),
    "Am": new ChemicalElement("Am", "Americium", 95, 243.0614, [2, 3, 4, 5, 6], 5, [241, 243]),
    "Cm": new ChemicalElement("Cm", "Curium", 96, 247.0703, [3, 4], 5, [243, 244, 245, 246, 247, 248]),
    "Bk": new ChemicalElement("Bk", "Berkelium", 97, 247.0703, [3, 4], 5, [247, 249]),
    "Cf": new ChemicalElement("Cf", "Californium", 98, 251.0796, [3], 5, [249, 250, 251, 252]),
    "Es": new ChemicalElement("Es", "Einsteinium", 99, 252.0829, [3], 5, []),
    "Fm": new ChemicalElement("Fm", "Fermium", 100, 257.0951, [3], 5, []),
    "Md": new ChemicalElement("Md", "Mendelevium", 101, 258.0984, [3], 5, []),
    "No": new ChemicalElement("No", "Nobelium", 102, 259.101, [3], 5, []),
    "Lr": new ChemicalElement("Lr", "Lawrencium", 103, 262.1098, [3], 5, []),
};

export { ChemicalElement, ChemicalElements };