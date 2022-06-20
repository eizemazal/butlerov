import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { BondType } from "../model/Bond";
import { Edge } from "../view/Edge";
import { Graph } from "../view/Graph";
import { Stylesheet } from "../view/Stylesheet";
import { Vertex } from "../view/Vertex";
import { Elements } from "../lib/elements";
import { Menu } from "../view/Menu";
import { MenuButton } from "../view/MenuButton";

class MoleculeEditor {
    stage: Konva.Stage;
    drawing_layer: Konva.Layer;
    background_layer: Konva.Layer;
    top_layer: Konva.Layer;
    welcome_message: Konva.Group;
    graph: Graph;
    menu: Menu;
    stylesheet: Stylesheet;
    active_edge: Edge | null;
    active_vertex: Vertex | null;
    downed_vertex: Vertex | null;
    constructor(stage: Konva.Stage) {
        this.stage = stage;
        this.stylesheet = new Stylesheet();
        this.graph = new Graph(this.stylesheet, this);
        this.background_layer = new Konva.Layer();
        this.background_layer.add(new Konva.Rect({
            x: 0,
            y: 0,
            width: this.stage.getAttr("width"),
            height: this.stage.getAttr("height"),
            fill: this.stylesheet.background_fill_color,
        }));
        this.welcome_message = new Konva.Group();
        this.background_layer.add(this.welcome_message);
        this.background_layer.on("click", (evt:KonvaEventObject<MouseEvent>) => { this.on_background_click(evt); } );
        this.background_layer.on("contextmenu", (evt:KonvaEventObject<MouseEvent>) => { evt.evt.preventDefault(); this.toggle_menu(); } );
        this.drawing_layer = new Konva.Layer();
        this.drawing_layer.add(this.graph.as_group());
        this.drawing_layer.draw();
        this.menu = new Menu();
        this.menu.visible = false;
        this.top_layer = new Konva.Layer();
        this.top_layer.add(this.menu.as_group());
        this.active_edge = null;
        this.active_vertex = null;
        this.downed_vertex = null;
        const container = this.stage.container();
        container.addEventListener("keydown", (e) => { e.preventDefault(); this.on_keydown(e); });
        container.tabIndex = 1;
        container.focus();
        this.stage.add(this.background_layer);
        this.stage.add(this.drawing_layer);
        this.stage.add(this.top_layer);
        this.update_background();
    }

    static from_html_element(stage_el_id: string) {
        const el = document.getElementById(stage_el_id);
        if (!el)
            throw Error("Unable to bind stage by id " + stage_el_id);
        const stage = new Konva.Stage({
            container: stage_el_id,
            width: el.clientWidth,
            height: el.clientHeight
        });
        return new MoleculeEditor(stage);
    }

    update_background() {
        if (this.graph.vertices.length || this.graph.edges.length) {
            this.welcome_message.visible(false);
            return;
        }
        this.welcome_message.visible(true);
        const txt = this.welcome_message.findOne("#welcome_text") || new Konva.Text({
            id: "welcome_text",
            x: this.stage.width() / 2,
            y: this.stage.height() / 2,
            fontSize: 14,
            fill: "#bbb",
            align: "center",
            text: "Welcome to my new chemical editor!\n Use your mouse to draw, and Spacebar to open context menu.",
        });
        txt.setAttr("x", (this.stage.width() - txt.width()) / 2);
        txt.setAttr("y", (this.stage.height() - txt.height()) / 2);
        this.welcome_message.add(<Konva.Text>txt);
    }

    autoscale_view() {
        const rect = this.graph.get_molecule_rect();
        this.stylesheet.scale = this.stylesheet.bond_length_px / this.graph.get_average_bond_distance();
        this.stylesheet.offset_x = (this.stage.width() - this.stylesheet.scale*(rect.x2-rect.x1)) / 2 - this.stylesheet.scale*rect.x1;
        this.stylesheet.offset_y = (this.stage.height() - this.stylesheet.scale*(rect.y2-rect.y1)) / 2 - this.stylesheet.scale*rect.y1;
        this.graph.update();
    }

    load_mol_from_string(mol_string: string) {
        this.graph.load_mol_string(mol_string);
        this.autoscale_view();
        this.update_background();
    }

    get_mol_string() {
        return this.graph.get_mol_string();
    }

    clear() {
        this.graph.clear();
        this.update_background();
    }

    get_next_element_label(label: string, key: string): string {
        const element_labels = Object.keys(Elements).filter(e => e.toLowerCase()[0] == key.toLowerCase()).sort((a,b) => a < b ? -1 : 1);
        if (element_labels.length == 0)
            return "";
        const index = element_labels.indexOf(label);
        if (index == -1 || index == element_labels.length - 1)
            return element_labels[0];
        return element_labels[index + 1];
    }

    on_vertex_keydown(evt: KeyboardEvent) {
        if (!this.active_vertex)
            return;
        if (evt.key == "Backspace" || evt.key == "Delete") {
            this.graph.delete_vertex(this.active_vertex);
            this.active_vertex = null;
            return;
        }
        if (evt.key.match(/[A-Za-z]/)) {
            const new_label = this.get_next_element_label(this.active_vertex.atom.label, evt.key);
            if (new_label == "")
                return;
            this.active_vertex.atom.label = new_label;
        }
        if (evt.key == "+") {
            this.active_vertex.atom.charge += 1;
        }
        if (evt.key == "-") {
            this.active_vertex.atom.charge -= 1;
        }
        this.active_vertex.update();
        this.graph.find_edges_by_vertex(this.active_vertex).forEach(e => e.update());
    }

    toggle_menu() {
        if (this.menu.visible) {
            this.menu.visible = false;
            return;
        }
        this.menu.x = this.stage.pointerPos?.x || this.stage.width() / 2;
        this.menu.y = this.stage.pointerPos?.y || this.stage.height() / 2;

        if (this.active_edge) {
            this.menu.clear_buttons();
            const edge = this.active_edge;
            edge.bond.bond_type != BondType.Single && this.menu.add_button( new MenuButton("1", "Single", () => {edge.bond.bond_type = BondType.Single; edge.update(); } ));
            edge.bond.bond_type != BondType.Double && this.menu.add_button( new MenuButton("2", "Double", () => {edge.bond.bond_type = BondType.Double; edge.update(); } ));
            edge.bond.bond_type != BondType.Triple && this.menu.add_button( new MenuButton("3", "Triple", () => {edge.bond.bond_type = BondType.Triple; edge.update(); } ));
            this.menu.add_button( new MenuButton("R", "Fuse ring", () => { this.menu_fuse_ring(edge); } ));
            this.menu.add_button( new MenuButton("x", "Delete", () => {this.graph.delete_edge(edge); } ));
        }
        else if (this.active_vertex) {
            this.menu.clear_buttons();
            const vertex = this.active_vertex;
            this.menu.add_button( new MenuButton("R", "Attach ring here", () => { this.menu_attach_ring(vertex); } ));
            this.menu.add_button( new MenuButton("C", "Add normal chain", () => { this.menu_chain(vertex); } ));
            //this.menu.add_button( new MenuButton("S", "Symmetry", () => { this.menu_symmetry_vertex(vertex); } ));
            this.menu.add_button( new MenuButton("x", "Delete", () => { this.graph.delete_vertex(vertex); } ));
        }
        else {
            this.menu.clear_buttons();
            this.menu.add_button( new MenuButton("x", "Clear drawing", () => { this.menu_confirm_clear(); } ));
        }
        this.menu.visible = true;
    }

    /*menu_symmetry_vertex(vertex: Vertex) {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("m", "Mirror at atom", () => { this.graph.attach_ring(vertex, 3); } ));
        this.menu.add_button( new MenuButton("2", "C2v / D2h", () => { this.graph.attach_ring(vertex, 4); } ));
        this.menu.add_button( new MenuButton("3", "C3v / D3h", () => { this.graph.attach_ring(vertex, 5); } ));
        this.menu.add_button( new MenuButton("4", "C4v / D4h / Td", () => { this.graph.attach_ring(vertex, 6); } ));
        this.menu.visible = true;
    }*/

    menu_attach_ring(vertex: Vertex) {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("3", "Cyclopropane", () => { this.graph.attach_ring(vertex, 3); } ));
        this.menu.add_button( new MenuButton("4", "Cyclobutane", () => { this.graph.attach_ring(vertex, 4); } ));
        this.menu.add_button( new MenuButton("5", "Cyclopentane", () => { this.graph.attach_ring(vertex, 5); } ));
        this.menu.add_button( new MenuButton("6", "Cyclohexane", () => { this.graph.attach_ring(vertex, 6); } ));
        this.menu.add_button( new MenuButton("7", "Cycloheptane", () => { this.graph.attach_ring(vertex, 7); } ));
        this.menu.add_button( new MenuButton("8", "Cyclooctane", () => { this.graph.attach_ring(vertex, 8); } ));
        this.menu.visible = true;
    }

    menu_fuse_ring(edge: Edge) {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("3", "Cyclopropane", () => { this.graph.fuse_ring(edge, 3); } ));
        this.menu.add_button( new MenuButton("4", "Cyclobutane", () => { this.graph.fuse_ring(edge, 4); } ));
        this.menu.add_button( new MenuButton("5", "Cyclopentane", () => { this.graph.fuse_ring(edge, 5); } ));
        this.menu.add_button( new MenuButton("6", "Cyclohexane", () => { this.graph.fuse_ring(edge, 6); } ));
        this.menu.add_button( new MenuButton("7", "Cycloheptane", () => { this.graph.fuse_ring(edge, 7); } ));
        this.menu.add_button( new MenuButton("8", "Cyclooctane", () => { this.graph.fuse_ring(edge, 8); } ));
        this.menu.visible = true;
    }

    menu_chain(vertex: Vertex) {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("1", "Methyl", () => { this.graph.add_chain(vertex, 1); } ));
        this.menu.add_button( new MenuButton("2", "Ethyl", () => { this.graph.add_chain(vertex, 2); } ));
        this.menu.add_button( new MenuButton("3", "Propyl", () => { this.graph.add_chain(vertex, 3); } ));
        this.menu.add_button( new MenuButton("4", "Butyl", () => { this.graph.add_chain(vertex, 4); } ));
        this.menu.add_button( new MenuButton("5", "Amyl", () => { this.graph.add_chain(vertex, 5); } ));
        this.menu.add_button( new MenuButton("6", "Hexyl", () => { this.graph.add_chain(vertex, 6); } ));
        this.menu.visible = true;
    }

    menu_confirm_clear() {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("Y", "Really clear?", () => { this.clear(); } ));
        //eslint-disable-next-line
        this.menu.add_button( new MenuButton("N", "Cancel", () => {} ));
        this.menu.visible = true;
    }

    on_keydown(evt: KeyboardEvent) {
        if (evt.key == " ") {
            this.toggle_menu();
            return;
        }
        if (this.menu.visible) {
            this.menu.handle_key(evt.key);
            return;
        }
        if (this.active_vertex) {
            this.on_vertex_keydown(evt);
            return;
        }
        if (this.active_edge) {
            switch (evt.key) {
            case "1":
                this.active_edge.bond.bond_type = BondType.Single;
                this.active_edge.update();
                break;
            case "2":
                this.active_edge.bond.bond_type = BondType.Double;
                this.active_edge.update();
                break;
            case "3":
                this.active_edge.bond.bond_type = BondType.Triple;
                this.active_edge.update();
                break;
            case "Backspace":
            case "Delete":
                this.graph.delete_edge(this.active_edge);
                this.active_edge = null;
            }

        }
    }

    on_edge_click(edge: Edge, evt: KonvaEventObject<MouseEvent>) {
        // disable right click processing
        if (evt.evt.button == 2)
            return;
        switch (edge.bond.bond_type) {
        case BondType.Single:
            edge.bond.bond_type = BondType.Double;
            break;
        case BondType.Double:
            edge.bond.bond_type = BondType.Triple;
            break;
        case BondType.Triple:
            edge.bond.bond_type = BondType.Single;
            break;
        }
        edge.update();
    }

    on_edge_mouseover(edge: Edge) {
        this.active_edge = edge;
        edge.active = true;
    }
    on_edge_mouseout(edge: Edge) {
        this.active_edge = null;
        edge.active = false;
    }

    on_vertex_dragmove(vertex: Vertex, evt: KonvaEventObject<MouseEvent>) {
        vertex.on_drag(!evt.evt.altKey);
        this.graph.find_edges_by_vertex(vertex).forEach(e => e.update());
    }

    on_vertex_mouseover(vertex: Vertex) {
        vertex.active = true;
        this.active_vertex = vertex;
    }

    on_vertex_mouseout(vertex: Vertex) {
        vertex.active = false;
        this.active_vertex = null;
    }

    on_vertex_click(vertex: Vertex, evt: KonvaEventObject<MouseEvent>) {
        // disable right click processing
        if (evt.evt.button == 2)
            return;
        this.graph.add_bound_vertex_to(vertex);
    }

    on_vertex_mousedown(vertex: Vertex) {
        this.downed_vertex = vertex;
    }

    on_vertex_mouseup(vertex: Vertex) {
        if (!this.downed_vertex)
            return;
        if (vertex != this.downed_vertex && !this.graph.vertices_are_bound(vertex, this.downed_vertex)) {
            const edge = this.graph.bind_vertices(this.downed_vertex, vertex);
            edge.update();
            this.downed_vertex.update();
            vertex.update();
        }
        this.downed_vertex = null;
    }

    on_background_click(evt: KonvaEventObject<MouseEvent>) {
        // disable right click processing
        if (evt.evt.button == 2)
            return;
        if (this.menu.visible) {
            this.menu.visible = false;
            return;
        }
        const pos = this.background_layer.getRelativePointerPosition();
        const vertex1 = this.graph.add_vertex(pos.x, pos.y);
        this.graph.add_bound_vertex_to(vertex1);
        this.update_background();
    }

    on_background_mouseup() {
        this.downed_vertex = null;
    }
}

export { MoleculeEditor };