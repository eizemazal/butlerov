<template>
    <v-list>
        <v-list-subheader>
            Style
        </v-list-subheader>
        <v-list-item>
            <v-select
                v-model="theme.global.name.value"
                label="App theme"
                variant="underlined"
                :items="theme_items"
            ></v-select>
        </v-list-item>
        <v-list-group>
            <template #activator="{ props }">
                <v-list-item
                    v-bind="props"
                    clas="pl-0"
                >
                    <v-list-subheader>Typography</v-list-subheader>
                </v-list-item>
            </template>
            <v-list-item>
                <v-text-field
                    v-model.number="model.atom_font_size_px"
                    label="Atom font size"
                    variant="underlined"
                    type="number"
                    step="0.2"
                    suffix="px"
                >
                </v-text-field>
                <v-text-field
                    v-model="model.atom_font_family"
                    label="Atom font family"
                    variant="underlined"
                >
                </v-text-field>
                <v-text-field
                    v-model.number="model.atom_label_horizontal_clearance_px"
                    label="Atom label horizontal clearance"
                    variant="underlined"
                    type="number"
                    suffix="px"
                >
                </v-text-field>
                <v-text-field
                    v-model.number="model.atom_label_vertical_clearance_px"
                    label="Atom label vertical clearance"
                    variant="underlined"
                    type="number"
                    suffix="px"
                >
                </v-text-field>


                <v-text-field
                    label="Atom charge font size"
                    variant="underlined"
                    type="number"
                    suffix="px"
                >
                </v-text-field>

                <v-text-field
                    label="Atom charge distance"
                    variant="underlined"
                    type="number"
                    suffix="px"
                >
                </v-text-field>
            </v-list-item>
        </v-list-group>
        <v-list-group>
            <template #activator="{ props }">
                <v-list-item
                    v-bind="props"
                    clas="pl-0"
                >
                    <v-list-subheader>Sizes</v-list-subheader>
                </v-list-item>
            </template>
            <v-list-item>

                <v-text-field
                    v-model.number="model.bond_length_px"
                    label="Bond default length"
                    variant="underlined"
                    type="number"
                    suffix="px"
                >
                </v-text-field>

                <v-text-field
                    v-model.number="model.bond_thickness_px"
                    label="Bond thickness"
                    variant="underlined"
                    type="number"
                    step="0.2"
                    suffix="px"
                >
                </v-text-field>

                <v-text-field
                    v-model.number="model.bond_wedge_px"
                    label="Bond wedge"
                    variant="underlined"
                    type="number"
                    step="0.2"
                    suffix="px"
                >
                </v-text-field>

                <v-text-field
                    v-model.number="model.bond_spacing_px"
                    label="Double bond spacing"
                    variant="underlined"
                    type="number"
                    step="0.2"
                    suffix="px"
                >
                </v-text-field>

                <v-text-field
                    v-model.number="model.double_bond_shortening"
                    label="Double bond shortening"
                    variant="underlined"
                    type="number"
                    step="0.05"
                    suffix="px"
                >
                </v-text-field>

                <v-text-field
                    v-model.number="model.bond_either_period_px"
                    label="Either bond period"
                    variant="underlined"
                    type="number"
                    step="0.2"
                    suffix="px"
                >
                </v-text-field>
            </v-list-item>
        </v-list-group>
        <v-list-group>
            <template #activator="{ props }">
                <v-list-item
                    v-bind="props"
                    clas="pl-0"
                >
                    <v-list-subheader>Editing</v-list-subheader>
                </v-list-item>
            </template>
            <v-list-item>
                <v-text-field
                    v-model.number="model.bond_hit_stroke_width"
                    label="Bond hit stroke width"
                    variant="underlined"
                    type="number"
                    suffix="px"
                >
                </v-text-field>
                <v-text-field
                    v-model.number="model.bond_snap_degrees"
                    label="Bond snap angle"
                    variant="underlined"
                    type="number"
                    step="15"
                    suffix="degrees"
                >
                </v-text-field>
            </v-list-item>
        </v-list-group>
    </v-list>
</template>

<script setup lang="ts">

import { useTheme } from 'vuetify';
import { Style, defaultStyle } from '@butlerov-chemistry/core';

const theme = useTheme();

const model = defineModel<Style>({default: () => defaultStyle });


const theme_items = [
    { key: "light", title: "light" },
    { key: "dark", title: "dark" },
]

</script>