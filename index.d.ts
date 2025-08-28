/**
 * Get the absolute path to the libsqlite3 shared library
 * @returns Absolute path to libsqlite3.dylib/.so
 */
export declare function getLibraryPath(): string;

/**
 * Hip alias for getLibraryPath() - for use with Database.setCustomSQLite()
 */
export declare const pathToSQLite: string;

export default getLibraryPath;