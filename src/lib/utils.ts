<<<<<<< HEAD
=======

>>>>>>> a9db2ca8afb83ba1351aa9e9178e522abe459450
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
<<<<<<< HEAD
=======

/**
 * Converts a File object or a file info object into a serializable format.
 * Returns undefined if the input is not a File or a valid file info object.
 * @param file - The File object or file info object.
 * @returns A serializable object with name, type, and size, or undefined.
 */
export const getSerializableFileInfo = (
    file: File | { name: string; type?: string; size?: number } | undefined | null
): { name: string; type?: string; size?: number } | undefined => {
    if (file instanceof File) {
        return { name: file.name, type: file.type, size: file.size };
    } else if (typeof file === 'object' && file !== null && 'name' in file) {
        // Ensure it has at least a name property
        return {
             name: file.name,
             type: file.type,
             size: file.size
         };
    }
    return undefined; // Not a file or file info
};

>>>>>>> a9db2ca8afb83ba1351aa9e9178e522abe459450
