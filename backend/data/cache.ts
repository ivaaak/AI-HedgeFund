import fs from 'fs';
import path from 'path';

interface CacheEntry<T> {
    expires: number;
    data: T;
}

/**
 * TTL cache kept in memory and mirrored to disk, so that restarting the server
 * does not burn through the data provider's daily request quota again.
 */
export class CacheService {
    private memory: Map<string, CacheEntry<unknown>> = new Map();
    private dir: string | null;

    constructor(dir: string | null = null) {
        this.dir = dir;
    }

    private filePath(key: string): string | null {
        if (!this.dir) return null;
        return path.join(this.dir, `${key.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);
    }

    public get<T>(key: string): T | undefined {
        let entry = this.memory.get(key) as CacheEntry<T> | undefined;

        if (!entry) {
            const file = this.filePath(key);
            if (file && fs.existsSync(file)) {
                try {
                    entry = JSON.parse(fs.readFileSync(file, 'utf8')) as CacheEntry<T>;
                    this.memory.set(key, entry);
                } catch {
                    // Corrupt cache file: treat as a miss
                    entry = undefined;
                }
            }
        }

        if (!entry) return undefined;

        if (entry.expires <= Date.now()) {
            this.delete(key);
            return undefined;
        }

        return entry.data;
    }

    public set<T>(key: string, data: T, ttlMs: number): void {
        const entry: CacheEntry<T> = { expires: Date.now() + ttlMs, data };
        this.memory.set(key, entry);

        const file = this.filePath(key);
        if (file) {
            try {
                fs.mkdirSync(path.dirname(file), { recursive: true });
                fs.writeFileSync(file, JSON.stringify(entry));
            } catch (error) {
                // The disk cache is an optimisation only
                console.warn(`Could not persist cache entry ${key}:`, (error as Error).message);
            }
        }
    }

    public delete(key: string): void {
        this.memory.delete(key);
        const file = this.filePath(key);
        if (file && fs.existsSync(file)) {
            try {
                fs.unlinkSync(file);
            } catch {
                // Ignore: the entry is expired either way
            }
        }
    }

    public clear(): void {
        for (const key of [...this.memory.keys()]) {
            this.delete(key);
        }
    }
}
