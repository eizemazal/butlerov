import type { ForgeConfig } from "@electron-forge/shared-types";

const config: ForgeConfig = {
    packagerConfig: {
        asar: true,
        osxSign: {}
    },
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            platforms: ["win32"],
            config: {
                authors: "Electron contributors"
            }
        },
        {
            name: "@electron-forge/maker-zip",
            platforms: ["darwin"],
            config: {}
        },
        {
            name: "@electron-forge/maker-deb",
            platforms: ["linux"],
            config: {}
        },
    ]
};

export default config;