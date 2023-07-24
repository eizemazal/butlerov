/**
 * Class that contains all the settings needed to render structures. Instantiated once and passed by
 * reference to all objects that are present on the drawing.
 */
class Stylesheet {
    /**
     * Font size of atom labels in pixels
     * * @defaultValue 12
     */
    atom_font_size_px: number;
    /**
     * Font family for atom labels
     * @defaultValue `Arial`
     */
    atom_font_family: string;
    /**
     * Atom label is a rectangular area containing text. This parameter specifies clearance between
     * left or right edge of text bounding box and edge representing chemical bond, in pixels.
     * @defaultValue 4
     */
    atom_label_horizontal_clearance_px: number;
    /**
     * Atom label is a rectangular area containing text. This parameter specifies clearance between
     * top or bottom edge of text bounding box and edge representing chemical bond, in pixels.
     * @defaultValue 4
     */
    atom_label_vertical_clearance_px: number;
    /**
     * Font size for atomic charges. Charges are represented by `－` (long minus) for single minus; digit with dash for
     * multiple negative charge like `2-`; `+` for single positive charge; and string like `3+` for multiple positive charges.
     * @defaultValue 9
     */
    atom_charge_font_size: number;

    /**
     * Atom charge can be drawn in frame that is something between rectangle and circle. Disabling it will draw naked text as charges.
     * @defaultValue true
     */
    atom_charge_frame_enabled: boolean;

    /**
     * Atom charge can be drawn in frame that is something between rectangle and circle, if {@link atom_charge_frame_enabled} is true.
     * This value specifies rect corner rounding in pixels for single charge, - or +. Set more to get these charges in circles, or
     * less to see them in rectangles. For multiple charges, {@link atom_charge_frame_corner_radius_multi} specifies corner radii.
     * @defaultValue 5
     */
    atom_charge_frame_corner_radius_single: number;
    /**
     * Atom charge can be drawn in frame that is something between rectangle and circle, if {@link atom_charge_frame_enabled} is true.
     * This value specifies rect corner rounding in pixels for single charge, - or +. Set more to get these charges in circles, or
     * less to see them in rectangles. For single charges, {@link atom_charge_frame_corner_radius_single} specifies corner radii.
     * @defaultValue 3
     */
    atom_charge_frame_corner_radius_multi: number;
    /**
     * Distance between atom center and text (and optionally charge frame, when enabled). This parameter takes effect only for
     * charges near carbon atoms without label.
     * @defaultValue 8
     */
    atom_charge_distance: number;
    /**
     * Color for atomic label, in HTML notation (hex / standard fixed colors like `teal`)
     * @defaultValue `#333`
     */
    atom_label_color: string;
    /**
     * When carbon atom (having no atom label) is hovered (becomes active), an active box is shown around it. The parameter specifies color in HTML notation
     * (hex like `#500` / standard fixed colors)
     * @defaultValue `red`
     */
    atom_active_box_color: string;
    /**
     * When atom having an atom label is hovered (becomes active), it is highlighted. The parameter specifies color in HTML notation
     * (hex like `#500` / standard fixed colors). Same color is used to color charges of hovered atoms.
     * @defaultValue `red`
     */
    atom_active_label_color: string;
    /**
     * Default length of bond that is created on click, in screen pixels. Note that it is possible to create bonds of different length.
     * When mol file is loaded into editor, the bonds can also have different lengths
     * @defaultValue 25
     */
    bond_length_px: number;
    /**
     * Thickness of stroke that is used to draw bonds.
     * @defaultValue 2
     */
    bond_thickness_px: number;
    /**
     * Wedged bonds representing stereochemistry are essentially triangles. The edge of this triangle facing atom will have
     * length represented by this parameter.
     * @defaultValue 6
     */
    bond_wedge_px: number;
    /**
     * Spacing between lines in double and triple bonds.
     * @defaultValue 6
     */
    bond_spacing_px: number;
    /**
     * Asymmetric double bonds with EdgeOrientation Left or Right, as well as triple bonds, are drawn as central sigma bond with full length,
     * and shorter line(s) representing pi bonds. These lines are shorter that the central bond by a factor of (1-double_bond_shortening).
     * @defaultValue 0.2
     */
    double_bond_shortening: number;
    /**
     * Stereo either bond is drawn as a zigzag fitted into triangle whose width is equal to bond_wedge_px.
     * The period of the zigzag in direction of axis connecting vertices is equal to this parameter.
     * @defaultValue 2.5
     */
    bond_either_period_px: number;
    /**
     * Color of bond stroke, in HTML notation (fixed colors like `red` or hex like `#555` are accepted).
     * @defaultValue `#555`
     */
    bond_stroke_color: string;
    /**
     * When an bond is hovered, it becomes "active", and highlighted with this color. HTML notation is accepted, like `#500` or `red`.
     * @defaultValue `red`
     */
    bond_active_color: string;
    /**
     * The bond is drawn as thin line that is hard to point with mouse. Therefore, hit area around the bond lines is larger.
     * The hit area looks like a line of larger stroke laying on the bond. The thickness is provided by this parameter, the larger the easier
     * to hit the bond with the mouse. This does not affect rendering, just user interaction.
     * @defaultValue 10
     */
    bond_hit_stroke_width: number;
    /**
     * When dragging bond with a mouse, it will snap to fixed angles to produce drawing that looks good. The angle can be customized here.
     * @defaultValue 30
     */
    bond_snap_degrees: number;
    /**
     * Color of background.
     * @defaultValue `white`
     */
    background_fill_color: string;
    /**
     * Enable debugging dots for atom centers. For performance reasons, changing this on the fly is not supported.
     * * @defaultValue `false`
     */
    debug_enable_atom_center_dots: boolean;
    /**
     * Enable debugging rects around atom labels. For performance reasons, changing this on the fly is not supported.
     * * @defaultValue `false`
     */
    debug_enable_label_rects: boolean;

    constructor() {
        this.atom_font_size_px = 12;
        this.atom_font_family = "Arial";
        this.atom_label_horizontal_clearance_px = 2;
        this.atom_label_vertical_clearance_px = 2;
        this.atom_charge_font_size = 9;
        this.atom_charge_frame_enabled = true;
        this.atom_charge_frame_corner_radius_single = 5;
        this.atom_charge_frame_corner_radius_multi = 3;
        this.atom_charge_distance = 8;
        this.atom_label_color = "#333";
        this.atom_active_box_color = "red";
        this.atom_active_label_color = "red";
        this.bond_length_px = 25;
        this.bond_thickness_px = 2;
        this.bond_wedge_px = 6;
        this.bond_spacing_px = 6;
        this.double_bond_shortening = 0.2;
        this.bond_either_period_px = 2.5;
        this.bond_stroke_color = "#555";
        this.bond_active_color = "red";
        this.bond_hit_stroke_width = 10;
        this.bond_snap_degrees = 30;
        this.background_fill_color = "white";
        this.debug_enable_atom_center_dots = false;
        this.debug_enable_label_rects = false;
    }
}

export { Stylesheet };