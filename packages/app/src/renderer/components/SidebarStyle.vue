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
                    <v-list-subheader>Fonts</v-list-subheader>
                </v-list-item>
            </template>
            <v-list-item>
                <v-text-field
                    v-model="model.atom_font_size_px"
                    label="Atom font size"
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

                <v-text-field
                    label="Atom label vertical clearance"
                    variant="underlined"
                    type="number"
                    suffix="px"
                >
                </v-text-field>
            </v-list-item>
        </v-list-group>
    </v-list>
</template>

<script setup lang="ts">

import { useTheme } from 'vuetify';
import { Style, defaultStyle } from 'butlerov';

const theme = useTheme();

const model = defineModel<Style>({default: {...defaultStyle}, required: true });

const theme_items = [
    { key: "light", title: "light" },
    { key: "dark", title: "dark" },
]

</script>