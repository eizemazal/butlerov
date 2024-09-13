import { Graph } from "../drawable/Graph";
import { Converter } from "./Converter";
import { EdgeShape } from "../drawable/Edge";
import { Vertex } from "../drawable/Vertex";


/**
 * Class to convert Graphs to/from molfile strings
 */
export class MolConverter extends Converter {
    /**
     * Load string of CTAB (Chemical tabular format aka .mol file) into @see Graph
     * @param s string with CTAB, for example, .mol file that is read from disk
     */
    from_string(s: string, graph: Graph | null): Graph {
        graph = graph ? graph : new Graph();
        graph.clear();
        const controller = graph.controller;
        if (controller)
            graph.detach();
        const lines = s.split("\n");
        if (lines.length < 5) {
            throw Error("The mol string is invalid.");
        }
        // discard lines 0,1,2
        let offset = 3;
        let atom_count;
        let bond_count;
        try {
            atom_count = parseInt(lines[offset].substring(0,3));
            bond_count = parseInt(lines[offset].substring(3,6));
        }
        catch {
            throw Error("String header block counts line does not match molfile specification");
        }
        if (lines.length < atom_count + bond_count + 5) {
            throw Error("Unexpected length of mol string");
        }
        offset += 1;
        for (let i = offset; i < offset+atom_count; i++) {
            const match_object = lines[i].match(/^\s*(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\s+(\w{1,2})/);
            if (!match_object)
                throw Error(`Error in line ${i}, unable to parse atom declaration`);
            const x = parseFloat(match_object[1]);
            const y = -parseFloat(match_object[3]);
            const element_label = match_object[7];
            const vertex = new Vertex();
            graph.vertices.push(vertex);
            vertex.coords = {x: x, y: y};
            vertex.label = element_label;
        }
        offset += atom_count;
        for (let i = offset; i < offset+bond_count; i++) {
            let atom_index1: number;
            let atom_index2: number;
            let bond_type: number;
            let stereo: number;
            try {
                // mol files use base-1 unlike arrays that are base-0
                atom_index2 = parseInt(lines[i].substring(0,3)) - 1;
                atom_index1 = parseInt(lines[i].substring(3,6)) - 1;
                bond_type = parseInt(lines[i].substring(6,9));
                stereo = parseInt(lines[i].substring(9,12));
            }
            catch {
                throw Error(`Error in line ${i}, unable to parse bond declaration`);
            }
            const edge = graph.bind_vertices(graph.vertices[atom_index2], graph.vertices[atom_index1], EdgeShape.Single);
            edge.bond_type = bond_type;
            edge.bond_stereo = stereo;
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
                if (count*2 != atom_charges.length)
                    throw Error("Charge line inconsistent - count does not match data.");
                for (let j = 0; j < count; j++) {
                    const v_index = parseInt(atom_charges[j*2]) - 1;
                    const charge = parseInt(atom_charges[j*2 + 1]);
                    graph.vertices[v_index].charge = charge;
                }
            }
            if (lines[i].match(/\s*M\s+ISO\s+.+/)) {
                const match_object = lines[i].match(/\s*M\s+ISO\s+(\d+)(.+)$/);
                if (!match_object)
                    throw Error("Isotope line inconsistent.");
                const count = parseInt(match_object[1]);
                const isotopes = match_object[2].trim().split(/\s+/);
                if (count*2 != isotopes.length)
                    throw Error("Isotope line inconsistent - count does not match data.");
                for (let j = 0; j < count; j++) {
                    const v_index = parseInt(isotopes[j*2]) - 1;
                    const isotope = parseInt(isotopes[j*2 + 1]);
                    graph.vertices[v_index].isotope = isotope;
                }
            }
        }
        if (controller) {
            const scaling_factor = graph.get_average_bond_distance() / controller.stylesheet.bond_length_px;
            graph.mol_scaling_factor = scaling_factor;
            graph.vertices.forEach( e => {
                e.coords = { x: e.coords.x / scaling_factor, y: e.coords.y / scaling_factor };
            });
            graph.attach(controller);
        }
        graph.update_topology();
        graph.edges.forEach(e => {graph?.update_edge_orientation(e);});
        return graph;
    }

    to_string(graph: Graph): string {
        let r = "";
        r += "Molecule name\n";
        r += "Generated by Butlerov\n";
        r += "[no comment provided]\n";
        const natoms = `${graph.vertices.length}`.padStart(3, " ");
        const nbonds = `${graph.edges.length}`.padStart(3, " ");
        r += `${natoms}${nbonds}  0  0  0  0  0  0  0  0  1 V2000\n`;
        const charges:Array<string> = [];
        const isotopes:Array<string> = [];
        graph.vertices.forEach((e,idx) => {
            const mol_rect = graph.get_molecule_rect();
            const scaled_x = (e.coords.x - mol_rect.x1) * graph.mol_scaling_factor;
            const scaled_y = (e.coords.y - mol_rect.y1) * graph.mol_scaling_factor;
            const x = `${scaled_x.toFixed(4)}`.padStart(10, " ");
            const y = `${(-scaled_y).toFixed(4)}`.padStart(10, " ");
            const z = "    0.0000";
            const element = `${e.label ? e.label : "C"}`.padEnd(3, " ");
            r += `${x}${y}${z} ${element} 0  0  0  0  0  0  0  0  0  0  0  0\n`;
            if (e.charge)
                charges.push(`${idx+1}`, `${e.charge}`);
            if (e.isotope)
                isotopes.push(`${idx+1}`, `${e.isotope}`);
        });
        graph.edges.forEach( e => {
            const v1index = `${graph.vertices.findIndex(v => v == e.v1)+1}`.padStart(3, " ");
            const v2index = `${graph.vertices.findIndex(v => v == e.v2)+1}`.padStart(3, " ");
            const bondtype = `${e.bond_type}`.padStart(3, " ");
            const stereo = `${e.bond_stereo}`.padStart(3, " ");
            r += `${v1index}${v2index}${bondtype}${stereo}  0  0  0\n`;
        });
        if (charges.length) {
            r += "M  CHG" + `${charges.length/2}`.padStart(3, " ");
            r += charges.reduce((a, e) => a + e.padStart(4, " "), "") + "\n";
        }
        if (isotopes.length) {
            r += "M  ISO" + `${isotopes.length/2}`.padStart(3, " ");
            r += isotopes.reduce((a, e) => a + e.padStart(4, " "), "") + "\n";
        }
        r += "M  END";
        return r;
    }

}