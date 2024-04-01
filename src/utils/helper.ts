export function generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return result;
}


export function buildUrl(base: string, options: Record<string, string>, hash?: string): string {
    const url = new URL(base);
    
    for (const [key, value] of Object.entries(options)) {
        url.searchParams.append(key, value);
    }
    
    if (hash) {
        url.hash = hash;
    }
    
    return url.toString();
}