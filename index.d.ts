/**
 * Get the absolute path to the libsqlite3 shared library
 * @returns Absolute path to libsqlite3.dylib/.so
 */
export declare function getLibraryPath(): string;

/**
 * Alias for getLibraryPath() to match @vlcn.io/crsqlite API style
 */
export declare const libraryPath: string;

/**
 * Default export for convenience
 */
declare const _default: {
    getLibraryPath: typeof getLibraryPath;
    libraryPath: string;
};
export default _default;