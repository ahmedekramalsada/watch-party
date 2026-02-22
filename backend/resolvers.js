const { exec } = require('child_process');

/**
 * Unpacks Dean Edwards' Packer obfuscation.
 */
function unpack(packed) {
    try {
        const argsMatch = packed.match(/}\('(.+)',(\d+),(\d+),'(.+)'\.split\('\|'\)\)/);
        if (!argsMatch) return null;

        let [_, p, a, c, k] = argsMatch;
        a = parseInt(a);
        c = parseInt(c);
        k = k.split('|');

        if (isNaN(a) || isNaN(c)) return null;

        const d = (c, a) => {
            return (c < a ? '' : d(parseInt(c / a), a)) +
                ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
        };

        const dict = {};
        while (c--) {
            dict[d(c, a)] = k[c] || d(c, a);
        }

        const unpacked = p.replace(/\b(\w+)\b/g, (match) => dict[match] || match);
        return unpacked;
    } catch (err) {
        console.error('Unpack error:', err);
        return null;
    }
}

/**
 * Specialized resolver for vidspeed.org and similar sites using JWPlayer + Packer.
 */
async function resolveVidspeed(url) {
    try {
        const response = await fetch(url);
        const html = await response.text();

        // Find the eval script block - use /s for multi-line support
        const fullEvalMatch = html.match(/eval\(function\(p,a,c,k,e,d\).+?\.split\('\|'\)\)\)/s);
        if (!fullEvalMatch) return null;

        const unpacked = unpack(fullEvalMatch[0]);
        if (!unpacked) return null;

        // Check if it's jwplayer
        if (!unpacked.includes('jwplayer')) return null;

        // Find the file URL in the unpacked JS
        const fileMatch = unpacked.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/);
        if (fileMatch) {
            return {
                url: fileMatch[1],
                name: 'Vidspeed Auto-Detected ✨'
            };
        }

        return null;
    } catch (err) {
        console.error('Vidspeed Resolver Error:', err);
        return null;
    }
}

async function resolveUqload(url) {
    try {
        const response = await fetch(url);
        const html = await response.text();

        // Regex for Clappr sources: ["..."]
        const sourcesMatch = html.match(/sources:\s*\["([^"]+)"\]/);
        if (sourcesMatch) {
            return {
                url: sourcesMatch[1],
                name: 'Uqload Auto-Detected ✨'
            };
        }

        return null;
    } catch (err) {
        console.error('Uqload Resolver Error:', err);
        return null;
    }
}

/**
 * Universal Resolver Entry Point
 */
async function resolveUrl(url) {
    // 1. Try specialized resolvers first
    if (url.includes('vidspeed.org')) {
        console.log('Using specialized vidspeed resolver...');
        const result = await resolveVidspeed(url);
        if (result) return result;
    }

    if (url.includes('uqload.is')) {
        console.log('Using specialized uqload resolver...');
        const result = await resolveUqload(url);
        if (result) return result;
    }

    // 2. Fallback to yt-dlp if specialized resolvers fail
    return new Promise((resolve) => {
        console.log('Falling back to yt-dlp...');
        exec(`yt-dlp --get-url -f "best" --no-playlist "${url}"`, (error, stdout, stderr) => {
            if (error || !stdout.trim()) {
                resolve(null);
            } else {
                resolve({
                    url: stdout.trim(),
                    name: 'Auto-Detected ✨'
                });
            }
        });
    });
}

module.exports = { resolveUrl };
