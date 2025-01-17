import { get_molecule_rect } from "../lib/graph";
import { Graph, Vertex, Edge, Converter, EdgeShape, LabelType, Document } from "../types";


// taken from Mol file specification
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


function get_edge_shape(bond_type: BondType, stereo: StereoType): EdgeShape {
    if (bond_type == BondType.Double)
        return EdgeShape.Double;
    if (bond_type == BondType.Triple)
        return EdgeShape.Triple;
    if (stereo == StereoType.Down)
        return EdgeShape.SingleDown;
    if (stereo == StereoType.Up)
        return EdgeShape.SingleUp;
    if (stereo == StereoType.Either)
        return EdgeShape.SingleEither;
    return EdgeShape.Single;
}

function get_bond_type_stereo(es: EdgeShape): [BondType, StereoType] {
    switch (es) {
        case EdgeShape.Double:
            return [BondType.Double, StereoType.Default];
        case EdgeShape.Triple:
            return [BondType.Triple, StereoType.Default];
        case EdgeShape.SingleDown:
            return [BondType.Single, StereoType.Down];
        case EdgeShape.SingleUp:
            return [BondType.Single, StereoType.Up];
        case EdgeShape.SingleEither:
            return [BondType.Single, StereoType.Either];
    }
    return [BondType.Single, StereoType.Default];
}



/**
 * Class to convert Graphs to/from molfile strings
 */
export class MolConverter implements Converter {
    /**
     * Load string of CTAB (Chemical tabular format aka .mol file) into @see Graph
     * @param s string with CTAB, for example, .mol file that is read from disk
     */
    graph_from_string(s: string): Graph {

        const graph: Graph = { type: "Graph", vertices: [], edges: [] };

        const lines = s.split("\n");
        if (lines.length < 5) {
            throw Error("The mol string is invalid.");
        }
        // discard lines 0,1,2
        let offset = 3;
        let atom_count;
        let bond_count;
        try {
            atom_count = parseInt(lines[offset].substring(0, 3));
            bond_count = parseInt(lines[offset].substring(3, 6));
        }
        catch {
            throw Error("String header block counts line does not match molfile specification");
        }
        if (lines.length < atom_count + bond_count + 5) {
            throw Error("Unexpected length of mol string");
        }
        offset += 1;
        for (let i = offset; i < offset + atom_count; i++) {
            const match_object = lines[i].match(/^\s*(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\s+(\w{1,2})/);
            if (!match_object)
                throw Error(`Error in line ${i}, unable to parse atom declaration`);
            const x = parseFloat(match_object[1]);
            const y = -parseFloat(match_object[3]);
            const element_label = match_object[7];
            const vertex: Vertex = {
                x, y, label: element_label, label_type: LabelType.Atom, charge: 0
            };
            graph.vertices.push(vertex);
        }
        offset += atom_count;
        for (let i = offset; i < offset + bond_count; i++) {
            let atom_index1: number;
            let atom_index2: number;
            let bond_type: number;
            let stereo: number;
            try {
                // mol files use base-1 unlike arrays that are base-0
                atom_index2 = parseInt(lines[i].substring(0, 3)) - 1;
                atom_index1 = parseInt(lines[i].substring(3, 6)) - 1;
                bond_type = parseInt(lines[i].substring(6, 9));
                stereo = parseInt(lines[i].substring(9, 12));
            }
            catch {
                throw Error(`Error in line ${i}, unable to parse bond declaration`);
            }
            const edge: Edge = { vertices: [atom_index2, atom_index1], shape: get_edge_shape(bond_type, stereo) };
            graph.edges.push(edge);
        }
        offset += bond_count;
        for (let i = offset; i < lines.length; i++) {
            if (lines[i].match(/\s*M\s+END\s*$/))
                break;
            if (lines[i].match(/\s*M\s+CHG\s+.+/)) {
                const match_object = lines[i].match(/\s*M\s+CHG\s+(\d+)(.+)$/);
                if (!match_object)
                    throw Error("Charge line inconsistent.");
                const count = parseInt(match_object[1]);
                const atom_charges = match_object[2].trim().split(/\s+/);
                if (count * 2 != atom_charges.length)
                    throw Error("Charge line inconsistent - count does not match data.");
                for (let j = 0; j < count; j++) {
                    const v_index = parseInt(atom_charges[j * 2]) - 1;
                    const charge = parseInt(atom_charges[j * 2 + 1]);
                    graph.vertices[v_index].charge = charge;
                }
            }
            if (lines[i].match(/\s*M\s+ISO\s+.+/)) {
                const match_object = lines[i].match(/\s*M\s+ISO\s+(\d+)(.+)$/);
                if (!match_object)
                    throw Error("Isotope line inconsistent.");
                const count = parseInt(match_object[1]);
                const isotopes = match_object[2].trim().split(/\s+/);
                if (count * 2 != isotopes.length)
                    throw Error("Isotope line inconsistent - count does not match data.");
                for (let j = 0; j < count; j++) {
                    const v_index = parseInt(isotopes[j * 2]) - 1;
                    const isotope = parseInt(isotopes[j * 2 + 1]);
                    graph.vertices[v_index].isotope = isotope;
                }
            }
        }
        return graph;
    }

    document_from_string(s: string): Document {
        return {
            mime: "application/butlerov",
            objects: [
                this.graph_from_string(s),
            ]
        };
    }

    graph_to_string(graph: Graph): string {
        let r = "";
        r += "Molecule name\n";
        r += "Generated by Butlerov\n";
        r += "[no comment provided]\n";
        const natoms = `${graph.vertices.length}`.padStart(3, " ");
        const nbonds = `${graph.edges?.length || 0}`.padStart(3, " ");
        r += `${natoms}${nbonds}  0  0  0  0  0  0  0  0  1 V2000\n`;
        const charges: string[] = [];
        const isotopes: string[] = [];
        graph.vertices.forEach((e, idx) => {
            const mol_rect = get_molecule_rect(graph);
            const offset_x = (e.x - mol_rect.x1);
            const offset_y = (e.y - mol_rect.y1);
            const x = `${offset_x.toFixed(4)}`.padStart(10, " ");
            const y = `${(-offset_y).toFixed(4)}`.padStart(10, " ");
            const z = "    0.0000";
            if (e.label_type != LabelType.Atom) {
                throw "Abbreviated/custom label cannot be saved to mol";
            }
            const element = `${e.label}`.padEnd(3, " ");
            r += `${x}${y}${z} ${element} 0  0  0  0  0  0  0  0  0  0  0  0\n`;
            if (e.charge)
                charges.push(`${idx + 1}`, `${e.charge}`);
            if (e.isotope)
                isotopes.push(`${idx + 1}`, `${e.isotope}`);
        });
        graph.edges?.forEach(e => {
            const v1index = `${e.vertices[0] + 1}`.padStart(3, " ");
            const v2index = `${e.vertices[1] + 1}`.padStart(3, " ");
            const [bond_type, stereo] = get_bond_type_stereo(e.shape);
            const bond_type_s = `${bond_type}`.padStart(3, " ");
            const stereo_s = `${stereo}`.padStart(3, " ");
            r += `${v1index}${v2index}${bond_type_s}${stereo_s}  0  0  0\n`;
        });
        if (charges.length) {
            r += "M  CHG" + `${charges.length / 2}`.padStart(3, " ");
            r += charges.reduce((a, e) => a + e.padStart(4, " "), "") + "\n";
        }
        if (isotopes.length) {
            r += "M  ISO" + `${isotopes.length / 2}`.padStart(3, " ");
            r += isotopes.reduce((a, e) => a + e.padStart(4, " "), "") + "\n";
        }
        r += "M  END";
        return r;
    }

}