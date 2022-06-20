class Stylesheet {
    atom_font_size_px: number;
    atom_font_family: string;
    atom_label_horizontal_clearance_px: number;
    atom_label_vertical_clearance_px: number;
    atom_label_color: string;
    atom_active_box_color: string;
    atom_active_label_color: string;
    bond_length_px: number;
    bond_thickness_px: number;
    bond_selected_thickness_px: number;
    bond_spacing_px: number;
    bond_stroke_color: string;
    bond_active_color: string;
    double_bond_shortening: number;
    hit_stroke_width: number;
    hit_atom_radius: number;
    bond_snap_degrees: number;
    scale: number;
    offset_x: number;
    offset_y: number;
    background_fill_color: string;

    constructor() {
        this.atom_font_size_px = 12;
        this.atom_font_family = "Arial";
        this.atom_label_horizontal_clearance_px = 4;
        this.atom_label_vertical_clearance_px = 4;
        this.atom_label_color = "#333";
        this.atom_active_box_color = "red";
        this.atom_active_label_color = "red";
        this.bond_length_px = 25;
        this.bond_thickness_px = 2;
        this.bond_selected_thickness_px = 3;
        this.bond_spacing_px = 6;
        this.bond_stroke_color = "#555";
        this.bond_active_color = "red";
        this.double_bond_shortening = 0.2;
        this.hit_stroke_width = 10;
        this.hit_atom_radius = 6;
        this.bond_snap_degrees = 30;
        this.scale = this.bond_length_px / 1.54;
        this.offset_x = 0;
        this.offset_y = 0;
        this.background_fill_color = "white";
    }
}

export { Stylesheet };