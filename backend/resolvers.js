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
 * Generic extractor for JWPlayer, Clappr, and other common patterns.
 */
function extractFromHtml(html) {
    // 1. Try Packer unpacking
    const evalMatch = html.match(/eval\(function\(p,a,c,k,e,d\).+?\.split\('\|'\)\)\)/gs);
    if (evalMatch) {
        for (const packed of evalMatch) {
            const unpacked = unpack(packed);
            if (unpacked) {
                // Look for common "file" or "sources" patterns in unpacked JS
                const fileMatch = unpacked.match(/file\s*:\s*["']([^"']+\.(m3u8|mp4|mkv)[^"']*)["']/);
                if (fileMatch) return fileMatch[1];

                const sourcesMatch = unpacked.match(/sources\s*:\s*\[\s*["']([^"']+)["']/);
                if (sourcesMatch) return sourcesMatch[1];
            }
        }
    }

    // 2. Try direct "sources" array regex (Clappr/JW8)
    const sourcesMatch = html.match(/sources:\s*\["([^"]+)"\]/);
    if (sourcesMatch) return sourcesMatch[1];

    // 3. Try standard "file" field
    const fileMatch = html.match(/file\s*:\s*["']([^"']+\.(m3u8|mp4|mkv)[^"']*)["']/);
    if (fileMatch) return fileMatch[1];

    // 4. Try <source> tags
    const tagMatch = html.match(/<source\s+[^>]*src=["']([^"']+)["']/i);
    if (tagMatch) return tagMatch[1];

    return null;
}

/**
 * Specialized resolver for various sites.
 */
async function resolveGeneric(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = await response.text();
        const videoUrl = extractFromHtml(html);

        if (videoUrl) {
            return {
                url: videoUrl,
                name: 'Auto-Detected ✨'
            };
        }
        return null;
    } catch (err) {
        console.error('Generic Resolver Error:', err);
        return null;
    }
}

/**
 * Universal Resolver Entry Point
 */
async function resolveUrl(url) {
    // 1. Try our powerful generic resolver first (handles Vidspeed, Uqload, and many others)
    console.log(`Checking generic resolver for: ${url}`);
    const result = await resolveGeneric(url);
    if (result) return result;

    // 2. Fallback to yt-dlp for major sites (YouTube, TikTok, Twitch, etc.)
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
