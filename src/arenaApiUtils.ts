import { requestUrl } from 'obsidian';

// Centralize rate limiting and GraphQL calling logic here, adapted from apiUtils
export interface RateLimiter {
    checkLimit: () => Promise<void>;
    resetCounter: () => void;
    complete: () => void;
}

export function createRateLimiter(
    maxRequestsPerMinute = 120, 
    delayBetweenRequests = 200,
    maxConcurrency = 5
): RateLimiter {
    let tokens = maxRequestsPerMinute;
    let lastRefill = Date.now();
    let activeRequests = 0;
    
    // Token Bucket rate limiter for Are.na API
    return {
        checkLimit: async () => {
            while (activeRequests >= maxConcurrency || tokens <= 0) {
                const now = Date.now();
                const timePassed = now - lastRefill;
                
                if (timePassed > 60000) {
                    tokens = maxRequestsPerMinute;
                    lastRefill = now;
                }
                
                if (tokens > 0 && activeRequests < maxConcurrency) break;
                await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
            }
            tokens--;
            activeRequests++;
            await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
        },
        complete: () => {
            activeRequests--;
        },
        resetCounter: () => {
            tokens = maxRequestsPerMinute;
            lastRefill = Date.now();
        }
    };
}

export async function arenaGraphQLRequest<T>(
    token: string, 
    query: string, 
    variables: Record<string, unknown>,
    limiter: RateLimiter
): Promise<T> {
    await limiter.checkLimit();
    try {
        const response = await requestUrl({
            url: 'https://api.are.na/graphql',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, variables })
        });
        
        const data = response.json as Record<string, unknown> | null | undefined;
        if (!data) {
            throw new Error('No response data received from Are.na GraphQL API');
        }
        if (data.errors) {
            console.error("GraphQL Errors:", data.errors);
            const errors = data.errors as Array<{ message?: string }>;
            throw new Error(`Are.na GraphQL Error: ${errors[0]?.message ?? 'Unknown error'}`);
        }
        
        return data.data as T;
    } finally {
        limiter.complete();
    }
}
