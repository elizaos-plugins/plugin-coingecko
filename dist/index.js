// src/actions/getMarkets.ts
import {
  composeContext,
  elizaLogger as elizaLogger2,
  generateObject,
  ModelClass
} from "@elizaos/core";
import axios2 from "axios";
import { z as z2 } from "zod";

// src/environment.ts
import { z } from "zod";
var coingeckoConfigSchema = z.object({
  COINGECKO_API_KEY: z.string().nullable(),
  COINGECKO_PRO_API_KEY: z.string().nullable()
}).refine((data) => data.COINGECKO_API_KEY || data.COINGECKO_PRO_API_KEY, {
  message: "Either COINGECKO_API_KEY or COINGECKO_PRO_API_KEY must be provided"
});
async function validateCoingeckoConfig(runtime) {
  const config = {
    COINGECKO_API_KEY: runtime.getSetting("COINGECKO_API_KEY"),
    COINGECKO_PRO_API_KEY: runtime.getSetting("COINGECKO_PRO_API_KEY")
  };
  return coingeckoConfigSchema.parse(config);
}
function getApiConfig(config) {
  const isPro = !!config.COINGECKO_PRO_API_KEY;
  return {
    baseUrl: isPro ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3",
    apiKey: isPro ? config.COINGECKO_PRO_API_KEY : config.COINGECKO_API_KEY,
    headerKey: isPro ? "x-cg-pro-api-key" : "x-cg-demo-api-key"
  };
}

// src/providers/categoriesProvider.ts
import { elizaLogger } from "@elizaos/core";
import axios from "axios";
var CACHE_KEY = "coingecko:categories";
var CACHE_TTL = 5 * 60;
var MAX_RETRIES = 3;
async function fetchCategories(runtime) {
  var _a;
  const config = await validateCoingeckoConfig(runtime);
  const { baseUrl, apiKey, headerKey } = getApiConfig(config);
  const response = await axios.get(
    `${baseUrl}/coins/categories/list`,
    {
      headers: {
        "accept": "application/json",
        [headerKey]: apiKey
      },
      timeout: 5e3
      // 5 second timeout
    }
  );
  if (!((_a = response.data) == null ? void 0 : _a.length)) {
    throw new Error("Invalid categories data received");
  }
  return response.data;
}
async function fetchWithRetry(runtime) {
  let lastError = null;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fetchCategories(runtime);
    } catch (error) {
      lastError = error;
      elizaLogger.error(`Categories fetch attempt ${i + 1} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, 1e3 * (i + 1)));
    }
  }
  throw lastError || new Error("Failed to fetch categories after multiple attempts");
}
async function getCategories(runtime) {
  try {
    const cached = await runtime.cacheManager.get(CACHE_KEY);
    if (cached) {
      return cached;
    }
    const categories = await fetchWithRetry(runtime);
    await runtime.cacheManager.set(CACHE_KEY, categories, { expires: CACHE_TTL });
    return categories;
  } catch (error) {
    elizaLogger.error("Error fetching categories:", error);
    throw error;
  }
}
function formatCategoriesContext(categories) {
  const popularCategories = [
    "layer-1",
    "defi",
    "meme",
    "ai-meme-coins",
    "artificial-intelligence",
    "gaming",
    "metaverse"
  ];
  const popular = categories.filter((c) => popularCategories.includes(c.category_id)).map((c) => `${c.name} (${c.category_id})`);
  return `
Available cryptocurrency categories:

Popular categories:
${popular.map((c) => `- ${c}`).join("\n")}

Total available categories: ${categories.length}

You can use these category IDs when filtering cryptocurrency market data.
`.trim();
}
var categoriesProvider = {
  // eslint-disable-next-line
  get: async (runtime, message, state) => {
    try {
      const categories = await getCategories(runtime);
      return formatCategoriesContext(categories);
    } catch (error) {
      elizaLogger.error("Categories provider error:", error);
      return "Cryptocurrency categories are temporarily unavailable. Please try again later.";
    }
  }
};
async function getCategoriesData(runtime) {
  return getCategories(runtime);
}

// src/templates/markets.ts
var getMarketsTemplate = `
Extract the following parameters for market listing:
- **vs_currency** (string): Target currency for price data (default: "usd")
- **category** (string, optional): Specific category ID from the available categories
- **per_page** (number): Number of results to return (1-250, default: 20)
- **order** (string): Sort order for results, one of:
  - market_cap_desc: Highest market cap first
  - market_cap_asc: Lowest market cap first
  - volume_desc: Highest volume first
  - volume_asc: Lowest volume first

Available Categories:
{{categories}}

Provide the values in the following JSON format:

\`\`\`json
{
    "vs_currency": "<currency>",
    "category": "<category_id>",
    "per_page": <number>,
    "order": "<sort_order>",
    "page": 1,
    "sparkline": false
}
\`\`\`

Example request: "Show me the top 10 gaming cryptocurrencies"
Example response:
\`\`\`json
{
    "vs_currency": "usd",
    "category": "gaming",
    "per_page": 10,
    "order": "market_cap_desc",
    "page": 1,
    "sparkline": false
}
\`\`\`

Example request: "What are the best performing coins by volume?"
Example response:
\`\`\`json
{
    "vs_currency": "usd",
    "per_page": 20,
    "order": "volume_desc",
    "page": 1,
    "sparkline": false
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}

Based on the conversation above, if the request is for a market listing/ranking, extract the appropriate parameters and respond with a JSON object. If the request is for specific coins only, respond with null.`;

// src/actions/getMarkets.ts
function formatCategory(category, categories) {
  if (!category) return void 0;
  const normalizedInput = category.toLowerCase().trim();
  const exactMatch = categories.find((c) => c.category_id === normalizedInput);
  if (exactMatch) {
    return exactMatch.category_id;
  }
  const nameMatch = categories.find(
    (c) => c.name.toLowerCase() === normalizedInput || c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === normalizedInput
  );
  if (nameMatch) {
    return nameMatch.category_id;
  }
  const partialMatch = categories.find(
    (c) => c.name.toLowerCase().includes(normalizedInput) || c.category_id.includes(normalizedInput)
  );
  if (partialMatch) {
    return partialMatch.category_id;
  }
  return void 0;
}
var GetMarketsSchema = z2.object({
  vs_currency: z2.string().default("usd"),
  category: z2.string().optional(),
  order: z2.enum(["market_cap_desc", "market_cap_asc", "volume_desc", "volume_asc"]).default("market_cap_desc"),
  per_page: z2.number().min(1).max(250).default(20),
  page: z2.number().min(1).default(1),
  sparkline: z2.boolean().default(false)
});
var isGetMarketsContent = (obj) => {
  return GetMarketsSchema.safeParse(obj).success;
};
var getMarkets_default = {
  name: "GET_MARKETS",
  similes: [
    "MARKET_OVERVIEW",
    "TOP_RANKINGS",
    "MARKET_LEADERBOARD",
    "CRYPTO_RANKINGS",
    "BEST_PERFORMING_COINS",
    "TOP_MARKET_CAPS"
  ],
  // eslint-disable-next-line
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  // Comprehensive endpoint for market rankings, supports up to 250 coins per request
  description: "Get ranked list of top cryptocurrencies sorted by market metrics (without specifying coins)",
  handler: async (runtime, message, state, _options, callback) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    elizaLogger2.log("Starting CoinGecko GET_MARKETS handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      const categories = await getCategoriesData(runtime);
      const marketsContext = composeContext({
        state: currentState,
        template: getMarketsTemplate.replace(
          "{{categories}}",
          categories.map((c) => `- ${c.name} (ID: ${c.category_id})`).join("\n")
        )
      });
      const result = await generateObject({
        runtime,
        context: marketsContext,
        modelClass: ModelClass.SMALL,
        schema: GetMarketsSchema
      });
      if (!isGetMarketsContent(result.object)) {
        elizaLogger2.error("Invalid market data format received");
        return false;
      }
      const content = result.object;
      elizaLogger2.log("Content from template:", content);
      if (!content) {
        return false;
      }
      const formattedCategory = formatCategory(content.category, categories);
      if (content.category && !formattedCategory) {
        throw new Error(`Invalid category: ${content.category}. Please choose from the available categories.`);
      }
      elizaLogger2.log("Making API request with params:", {
        url: `${baseUrl}/coins/markets`,
        category: formattedCategory,
        vs_currency: content.vs_currency,
        order: content.order,
        per_page: content.per_page,
        page: content.page
      });
      const response = await axios2.get(
        `${baseUrl}/coins/markets`,
        {
          headers: {
            "accept": "application/json",
            [headerKey]: apiKey
          },
          params: {
            vs_currency: content.vs_currency,
            category: formattedCategory,
            order: content.order,
            per_page: content.per_page,
            page: content.page,
            sparkline: content.sparkline
          }
        }
      );
      if (!((_a = response.data) == null ? void 0 : _a.length)) {
        throw new Error("No market data received from CoinGecko API");
      }
      const formattedData = response.data.map((coin) => ({
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        marketCapRank: coin.market_cap_rank,
        currentPrice: coin.current_price,
        priceChange24h: coin.price_change_24h,
        priceChangePercentage24h: coin.price_change_percentage_24h,
        marketCap: coin.market_cap,
        volume24h: coin.total_volume,
        high24h: coin.high_24h,
        low24h: coin.low_24h,
        circulatingSupply: coin.circulating_supply,
        totalSupply: coin.total_supply,
        maxSupply: coin.max_supply,
        lastUpdated: coin.last_updated
      }));
      const categoryDisplay = content.category ? `${((_b = categories.find((c) => c.category_id === formattedCategory)) == null ? void 0 : _b.name.toUpperCase()) || content.category.toUpperCase()} ` : "";
      const responseText = [
        `Top ${formattedData.length} ${categoryDisplay}Cryptocurrencies by ${content.order === "volume_desc" || content.order === "volume_asc" ? "Volume" : "Market Cap"}:`,
        ...formattedData.map(
          (coin, index) => `${index + 1}. ${coin.name} (${coin.symbol}) | $${coin.currentPrice.toLocaleString()} | ${coin.priceChangePercentage24h.toFixed(2)}% | MCap: $${(coin.marketCap / 1e9).toFixed(2)}B`
        )
      ].join("\n");
      elizaLogger2.success("Market data retrieved successfully!");
      if (callback) {
        callback({
          text: responseText,
          content: {
            markets: formattedData,
            params: {
              vs_currency: content.vs_currency,
              category: content.category,
              order: content.order,
              per_page: content.per_page,
              page: content.page
            },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger2.error("Error in GET_MARKETS handler:", error);
      let errorMessage;
      if (((_c = error.response) == null ? void 0 : _c.status) === 429) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (((_d = error.response) == null ? void 0 : _d.status) === 403) {
        errorMessage = "This endpoint requires a CoinGecko Pro API key. Please upgrade your plan to access this data.";
      } else if (((_e = error.response) == null ? void 0 : _e.status) === 400) {
        errorMessage = "Invalid request parameters. Please check your input.";
      } else {
        errorMessage = `Error fetching market data: ${error.message}`;
      }
      if (callback) {
        callback({
          text: errorMessage,
          error: {
            message: error.message,
            statusCode: (_f = error.response) == null ? void 0 : _f.status,
            params: (_g = error.config) == null ? void 0 : _g.params,
            requiresProPlan: ((_h = error.response) == null ? void 0 : _h.status) === 403
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me the top cryptocurrencies by market cap"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch the current market data for top cryptocurrencies.",
          action: "GET_MARKETS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the top cryptocurrencies:\n1. Bitcoin (BTC) | $45,000 | +2.5% | MCap: $870.5B\n{{dynamic}}"
        }
      }
    ]
  ]
};

// src/actions/getPrice.ts
import {
  composeContext as composeContext2,
  elizaLogger as elizaLogger4,
  generateObject as generateObject2,
  ModelClass as ModelClass2
} from "@elizaos/core";
import axios4 from "axios";
import { z as z3 } from "zod";

// src/providers/coinsProvider.ts
import { elizaLogger as elizaLogger3 } from "@elizaos/core";
import axios3 from "axios";
var CACHE_KEY2 = "coingecko:coins";
var CACHE_TTL2 = 5 * 60;
var MAX_RETRIES2 = 3;
async function fetchCoins(runtime, includePlatform = false) {
  var _a;
  const config = await validateCoingeckoConfig(runtime);
  const { baseUrl, apiKey, headerKey } = getApiConfig(config);
  const response = await axios3.get(
    `${baseUrl}/coins/list`,
    {
      params: {
        include_platform: includePlatform
      },
      headers: {
        "accept": "application/json",
        [headerKey]: apiKey
      },
      timeout: 5e3
      // 5 second timeout
    }
  );
  if (!((_a = response.data) == null ? void 0 : _a.length)) {
    throw new Error("Invalid coins data received");
  }
  return response.data;
}
async function fetchWithRetry2(runtime, includePlatform = false) {
  let lastError = null;
  for (let i = 0; i < MAX_RETRIES2; i++) {
    try {
      return await fetchCoins(runtime, includePlatform);
    } catch (error) {
      lastError = error;
      elizaLogger3.error(`Coins fetch attempt ${i + 1} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, 1e3 * (i + 1)));
    }
  }
  throw lastError || new Error("Failed to fetch coins after multiple attempts");
}
async function getCoins(runtime, includePlatform = false) {
  try {
    const cached = await runtime.cacheManager.get(CACHE_KEY2);
    if (cached) {
      return cached;
    }
    const coins = await fetchWithRetry2(runtime, includePlatform);
    await runtime.cacheManager.set(CACHE_KEY2, coins, { expires: CACHE_TTL2 });
    return coins;
  } catch (error) {
    elizaLogger3.error("Error fetching coins:", error);
    throw error;
  }
}
function formatCoinsContext(coins) {
  const popularCoins = [
    "bitcoin",
    "ethereum",
    "binancecoin",
    "ripple",
    "cardano",
    "solana",
    "polkadot",
    "dogecoin"
  ];
  const popular = coins.filter((c) => popularCoins.includes(c.id)).map((c) => `${c.name} (${c.symbol.toUpperCase()}) - ID: ${c.id}`);
  return `
Available cryptocurrencies:

Popular coins:
${popular.map((c) => `- ${c}`).join("\n")}

Total available coins: ${coins.length}

You can use these coin IDs when querying specific cryptocurrency data.
`.trim();
}
var coinsProvider = {
  // eslint-disable-next-line
  get: async (runtime, message, state) => {
    try {
      const coins = await getCoins(runtime);
      return formatCoinsContext(coins);
    } catch (error) {
      elizaLogger3.error("Coins provider error:", error);
      return "Cryptocurrency list is temporarily unavailable. Please try again later.";
    }
  }
};
async function getCoinsData(runtime, includePlatform = false) {
  return getCoins(runtime, includePlatform);
}

// src/templates/price.ts
var getPriceTemplate = `
Extract the following parameters for cryptocurrency price data:
- **coinIds** (string | string[]): The ID(s) of the cryptocurrency/cryptocurrencies to get prices for (e.g., "bitcoin" or ["bitcoin", "ethereum"])
- **currency** (string | string[]): The currency/currencies to display prices in (e.g., "usd" or ["usd", "eur", "jpy"]) - defaults to ["usd"]
- **include_market_cap** (boolean): Whether to include market cap data - defaults to false
- **include_24hr_vol** (boolean): Whether to include 24h volume data - defaults to false
- **include_24hr_change** (boolean): Whether to include 24h price change data - defaults to false
- **include_last_updated_at** (boolean): Whether to include last update timestamp - defaults to false

Provide the values in the following JSON format:

\`\`\`json
{
    "coinIds": "bitcoin",
    "currency": ["usd"],
    "include_market_cap": false,
    "include_24hr_vol": false,
    "include_24hr_change": false,
    "include_last_updated_at": false
}
\`\`\`

Example request: "What's the current price of Bitcoin?"
Example response:
\`\`\`json
{
    "coinIds": "bitcoin",
    "currency": ["usd"],
    "include_market_cap": false,
    "include_24hr_vol": false,
    "include_24hr_change": false,
    "include_last_updated_at": false
}
\`\`\`

Example request: "Show me ETH price and market cap in EUR with last update time"
Example response:
\`\`\`json
{
    "coinIds": "ethereum",
    "currency": ["eur"],
    "include_market_cap": true,
    "include_24hr_vol": false,
    "include_24hr_change": false,
    "include_last_updated_at": true
}
\`\`\`

Example request: "What's the current price of Bitcoin in USD, JPY and EUR?"
Example response:
\`\`\`json
{
    "coinIds": "bitcoin",
    "currency": ["usd", "jpy", "eur"],
    "include_market_cap": false,
    "include_24hr_vol": false,
    "include_24hr_change": false,
    "include_last_updated_at": false
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}

Based on the conversation above, if the request is for cryptocurrency price data, extract the appropriate parameters and respond with a JSON object. If the request is not related to price data, respond with null.`;

// src/actions/getPrice.ts
var GetPriceSchema = z3.object({
  coinIds: z3.union([z3.string(), z3.array(z3.string())]),
  currency: z3.union([z3.string(), z3.array(z3.string())]).default(["usd"]),
  include_market_cap: z3.boolean().default(false),
  include_24hr_vol: z3.boolean().default(false),
  include_24hr_change: z3.boolean().default(false),
  include_last_updated_at: z3.boolean().default(false)
});
var isGetPriceContent = (obj) => {
  return GetPriceSchema.safeParse(obj).success;
};
function formatCoinIds(input) {
  if (Array.isArray(input)) {
    return input.join(",");
  }
  return input;
}
var getPrice_default = {
  name: "GET_PRICE",
  similes: [
    "COIN_PRICE_CHECK",
    "SPECIFIC_COINS_PRICE",
    "COIN_PRICE_LOOKUP",
    "SELECTED_COINS_PRICE",
    "PRICE_DETAILS",
    "COIN_PRICE_DATA"
  ],
  // eslint-disable-next-line
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get price and basic market data for one or more specific cryptocurrencies (by name/symbol)",
  handler: async (runtime, message, state, _options, callback) => {
    var _a, _b, _c, _d, _e, _f;
    elizaLogger4.log("Starting CoinGecko GET_PRICE handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger4.log("Composing price context...");
      const priceContext = composeContext2({
        state: currentState,
        template: getPriceTemplate
      });
      elizaLogger4.log("Generating content from template...");
      const result = await generateObject2({
        runtime,
        context: priceContext,
        modelClass: ModelClass2.LARGE,
        schema: GetPriceSchema
      });
      if (!isGetPriceContent(result.object)) {
        elizaLogger4.error("Invalid price request format");
        return false;
      }
      const content = result.object;
      elizaLogger4.log("Generated content:", content);
      const currencies = Array.isArray(content.currency) ? content.currency : [content.currency];
      const vs_currencies = currencies.join(",").toLowerCase();
      const coinIds = formatCoinIds(content.coinIds);
      elizaLogger4.log("Formatted request parameters:", { coinIds, vs_currencies });
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger4.log(`Fetching prices for ${coinIds} in ${vs_currencies}...`);
      elizaLogger4.log("API request URL:", `${baseUrl}/simple/price`);
      elizaLogger4.log("API request params:", {
        ids: coinIds,
        vs_currencies,
        include_market_cap: content.include_market_cap,
        include_24hr_vol: content.include_24hr_vol,
        include_24hr_change: content.include_24hr_change,
        include_last_updated_at: content.include_last_updated_at
      });
      const response = await axios4.get(
        `${baseUrl}/simple/price`,
        {
          params: {
            ids: coinIds,
            vs_currencies,
            include_market_cap: content.include_market_cap,
            include_24hr_vol: content.include_24hr_vol,
            include_24hr_change: content.include_24hr_change,
            include_last_updated_at: content.include_last_updated_at
          },
          headers: {
            "accept": "application/json",
            [headerKey]: apiKey
          }
        }
      );
      if (Object.keys(response.data).length === 0) {
        throw new Error("No price data available for the specified coins and currency");
      }
      const coins = await getCoinsData(runtime);
      const formattedResponse = Object.entries(response.data).map(([coinId, data]) => {
        const coin = coins.find((c) => c.id === coinId);
        const coinName = coin ? `${coin.name} (${coin.symbol.toUpperCase()})` : coinId;
        const parts = [`${coinName}:`];
        for (const currency of currencies) {
          const upperCurrency = currency.toUpperCase();
          if (data[currency]) {
            parts.push(`  ${upperCurrency}: ${data[currency].toLocaleString(void 0, {
              style: "currency",
              currency
            })}`);
          }
          if (content.include_market_cap) {
            const marketCap = data[`${currency}_market_cap`];
            if (marketCap !== void 0) {
              parts.push(`  Market Cap (${upperCurrency}): ${marketCap.toLocaleString(void 0, {
                style: "currency",
                currency,
                maximumFractionDigits: 0
              })}`);
            }
          }
          if (content.include_24hr_vol) {
            const volume = data[`${currency}_24h_vol`];
            if (volume !== void 0) {
              parts.push(`  24h Volume (${upperCurrency}): ${volume.toLocaleString(void 0, {
                style: "currency",
                currency,
                maximumFractionDigits: 0
              })}`);
            }
          }
          if (content.include_24hr_change) {
            const change = data[`${currency}_24h_change`];
            if (change !== void 0) {
              const changePrefix = change >= 0 ? "+" : "";
              parts.push(`  24h Change (${upperCurrency}): ${changePrefix}${change.toFixed(2)}%`);
            }
          }
        }
        if (content.include_last_updated_at && data.last_updated_at) {
          const lastUpdated = new Date(data.last_updated_at * 1e3).toLocaleString();
          parts.push(`  Last Updated: ${lastUpdated}`);
        }
        return parts.join("\n");
      }).filter(Boolean);
      if (formattedResponse.length === 0) {
        throw new Error("Failed to format price data for the specified coins");
      }
      const responseText = formattedResponse.join("\n\n");
      elizaLogger4.success("Price data retrieved successfully!");
      if (callback) {
        callback({
          text: responseText,
          content: {
            prices: Object.entries(response.data).reduce((acc, [coinId, data]) => {
              const coinPrices = currencies.reduce((currencyAcc, currency) => {
                const currencyData = {
                  price: data[currency],
                  marketCap: data[`${currency}_market_cap`],
                  volume24h: data[`${currency}_24h_vol`],
                  change24h: data[`${currency}_24h_change`],
                  lastUpdated: data.last_updated_at
                };
                Object.assign(currencyAcc, { [currency]: currencyData });
                return currencyAcc;
              }, {});
              Object.assign(acc, { [coinId]: coinPrices });
              return acc;
            }, {}),
            params: {
              currencies: currencies.map((c) => c.toUpperCase()),
              include_market_cap: content.include_market_cap,
              include_24hr_vol: content.include_24hr_vol,
              include_24hr_change: content.include_24hr_change,
              include_last_updated_at: content.include_last_updated_at
            }
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger4.error("Error in GET_PRICE handler:", error);
      let errorMessage;
      if (((_a = error.response) == null ? void 0 : _a.status) === 429) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (((_b = error.response) == null ? void 0 : _b.status) === 403) {
        errorMessage = "This endpoint requires a CoinGecko Pro API key. Please upgrade your plan to access this data.";
      } else if (((_c = error.response) == null ? void 0 : _c.status) === 400) {
        errorMessage = "Invalid request parameters. Please check your input.";
      }
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: (_d = error.response) == null ? void 0 : _d.status,
            params: (_e = error.config) == null ? void 0 : _e.params,
            requiresProPlan: ((_f = error.response) == null ? void 0 : _f.status) === 403
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What's the current price of Bitcoin?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the current Bitcoin price for you.",
          action: "GET_PRICE"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "The current price of Bitcoin is {{dynamic}} USD"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check ETH and BTC prices in EUR with market cap"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the current prices with market cap data.",
          action: "GET_PRICE"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Bitcoin: EUR {{dynamic}} | Market Cap: \u20AC{{dynamic}}\nEthereum: EUR {{dynamic}} | Market Cap: \u20AC{{dynamic}}"
        }
      }
    ]
  ]
};

// src/actions/getPricePerAddress.ts
import {
  composeContext as composeContext3,
  elizaLogger as elizaLogger5,
  generateObject as generateObject3,
  ModelClass as ModelClass3
} from "@elizaos/core";
import axios5 from "axios";
import { z as z4 } from "zod";

// src/templates/priceAddress.ts
var getPriceByAddressTemplate = `
Extract the following parameters for token price data:
- **chainId** (string): The blockchain network ID (e.g., "ethereum", "polygon", "binance-smart-chain")
- **tokenAddress** (string): The contract address of the token
- **include_market_cap** (boolean): Whether to include market cap data - defaults to true

Normalize chain IDs to lowercase names: ethereum, polygon, binance-smart-chain, avalanche, fantom, arbitrum, optimism, etc.
Token address should be the complete address string, maintaining its original case.

Provide the values in the following JSON format:

\`\`\`json
{
    "chainId": "ethereum",
    "tokenAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "include_market_cap": true
}
\`\`\`

Example request: "What's the price of USDC on Ethereum? Address: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
Example response:
\`\`\`json
{
    "chainId": "ethereum",
    "tokenAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "include_market_cap": true
}
\`\`\`

Example request: "Check the price for this token on Polygon: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
Example response:
\`\`\`json
{
    "chainId": "polygon",
    "tokenAddress": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    "include_market_cap": true
}
\`\`\`

Example request: "Get price for BONK token on Solana with address HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC"
Example response:
\`\`\`json
{
    "chainId": "solana",
    "tokenAddress": "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}

Based on the conversation above, use last question made and if the request is for token price data and includes both a chain and address, extract the appropriate parameters and respond with a JSON object. If the request is not related to token price data or missing required information, respond with null.`;

// src/actions/getPricePerAddress.ts
var GetTokenPriceSchema = z4.object({
  chainId: z4.string(),
  tokenAddress: z4.string()
});
var isGetTokenPriceContent = (obj) => {
  return GetTokenPriceSchema.safeParse(obj).success;
};
var getPricePerAddress_default = {
  name: "GET_TOKEN_PRICE_BY_ADDRESS",
  similes: [
    "FETCH_TOKEN_PRICE_BY_ADDRESS",
    "CHECK_TOKEN_PRICE_BY_ADDRESS",
    "LOOKUP_TOKEN_BY_ADDRESS"
  ],
  // eslint-disable-next-line
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get the current USD price for a token using its blockchain address",
  handler: async (runtime, message, state, _options, callback) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    elizaLogger5.log("Starting GET_TOKEN_PRICE_BY_ADDRESS handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger5.log("Composing token price context...");
      const context = composeContext3({
        state: currentState,
        template: getPriceByAddressTemplate
      });
      elizaLogger5.log("Generating content from template...");
      const result = await generateObject3({
        runtime,
        context,
        modelClass: ModelClass3.SMALL,
        schema: GetTokenPriceSchema
      });
      if (!isGetTokenPriceContent(result.object)) {
        elizaLogger5.error("Invalid token price request format");
        return false;
      }
      const content = result.object;
      elizaLogger5.log("Generated content:", content);
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger5.log("Fetching token data...");
      const response = await axios5.get(
        `${baseUrl}/coins/${content.chainId}/contract/${content.tokenAddress}`,
        {
          headers: {
            accept: "application/json",
            [headerKey]: apiKey
          }
        }
      );
      const tokenData = response.data;
      if (!((_b = (_a = tokenData.market_data) == null ? void 0 : _a.current_price) == null ? void 0 : _b.usd)) {
        throw new Error(
          `No price data available for token ${content.tokenAddress} on ${content.chainId}`
        );
      }
      const parts = [
        `${tokenData.name} (${tokenData.symbol.toUpperCase()})`,
        `Address: ${content.tokenAddress}`,
        `Chain: ${content.chainId}`,
        `Price: $${tokenData.market_data.current_price.usd.toFixed(6)} USD`
      ];
      if ((_c = tokenData.market_data.market_cap) == null ? void 0 : _c.usd) {
        parts.push(
          `Market Cap: $${tokenData.market_data.market_cap.usd.toLocaleString()} USD`
        );
      }
      const responseText = parts.join("\n");
      elizaLogger5.success("Token price data retrieved successfully!");
      if (callback) {
        callback({
          text: responseText,
          content: {
            token: {
              name: tokenData.name,
              symbol: tokenData.symbol,
              address: content.tokenAddress,
              chain: content.chainId,
              price: tokenData.market_data.current_price.usd,
              marketCap: (_d = tokenData.market_data.market_cap) == null ? void 0 : _d.usd
            }
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger5.error(
        "Error in GET_TOKEN_PRICE_BY_ADDRESS handler:",
        error
      );
      let errorMessage;
      if (((_e = error.response) == null ? void 0 : _e.status) === 429) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (((_f = error.response) == null ? void 0 : _f.status) === 403) {
        errorMessage = "This endpoint requires a CoinGecko Pro API key. Please upgrade your plan to access this data.";
      } else if (((_g = error.response) == null ? void 0 : _g.status) === 400) {
        errorMessage = "Invalid request parameters. Please check your input.";
      } else {
        errorMessage = "Failed to fetch token price. Please try again later.";
      }
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: (_h = error.response) == null ? void 0 : _h.status,
            requiresProPlan: ((_i = error.response) == null ? void 0 : _i.status) === 403
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What's the price of the USDC token on Ethereum? The address is 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the USDC token price for you.",
          action: "GET_TOKEN_PRICE_BY_ADDRESS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "USD Coin (USDC)\nAddress: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48\nChain: ethereum\nPrice: {{dynamic}} USD\nMarket Cap: ${{dynamic}} USD"
        }
      }
    ]
  ]
};

// src/actions/getTopGainersLosers.ts
import {
  composeContext as composeContext4,
  elizaLogger as elizaLogger6,
  generateObject as generateObject4,
  ModelClass as ModelClass4
} from "@elizaos/core";
import axios6 from "axios";
import { z as z5 } from "zod";

// src/templates/gainersLosers.ts
var getTopGainersLosersTemplate = `
Extract the following parameters for top gainers and losers data:
- **vs_currency** (string): The target currency to display prices in (e.g., "usd", "eur") - defaults to "usd"
- **duration** (string): Time range for price changes - one of "24h", "7d", "14d", "30d", "60d", "1y" - defaults to "24h"
- **top_coins** (string): Filter by market cap ranking (e.g., "100", "1000") - defaults to "1000"

Provide the values in the following JSON format:

\`\`\`json
{
    "vs_currency": "usd",
    "duration": "24h",
    "top_coins": "1000"
}
\`\`\`

Example request: "Show me the biggest gainers and losers today"
Example response:
\`\`\`json
{
    "vs_currency": "usd",
    "duration": "24h",
    "top_coins": "1000"
}
\`\`\`

Example request: "What are the top movers in EUR for the past week?"
Example response:
\`\`\`json
{
    "vs_currency": "eur",
    "duration": "7d",
    "top_coins": "300"
}
\`\`\`

Example request: "Show me monthly performance of top 100 coins"
Example response:
\`\`\`json
{
    "vs_currency": "usd",
    "duration": "30d",
    "top_coins": "100"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}

Based on the conversation above, if the request is for top gainers and losers data, extract the appropriate parameters and respond with a JSON object. If the request is not related to top movers data, respond with null.`;

// src/actions/getTopGainersLosers.ts
var DurationEnum = z5.enum(["1h", "24h", "7d", "14d", "30d", "60d", "1y"]);
var GetTopGainersLosersSchema = z5.object({
  vs_currency: z5.string().default("usd"),
  duration: DurationEnum.default("24h"),
  top_coins: z5.string().default("1000")
});
var isGetTopGainersLosersContent = (obj) => {
  return GetTopGainersLosersSchema.safeParse(obj).success;
};
var getTopGainersLosers_default = {
  name: "GET_TOP_GAINERS_LOSERS",
  similes: [
    "TOP_MOVERS",
    "BIGGEST_GAINERS",
    "BIGGEST_LOSERS",
    "PRICE_CHANGES",
    "BEST_WORST_PERFORMERS"
  ],
  // eslint-disable-next-line
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get list of top gaining and losing cryptocurrencies by price change",
  handler: async (runtime, message, state, _options, callback) => {
    var _a, _b, _c, _d, _e, _f;
    elizaLogger6.log("Starting CoinGecko GET_TOP_GAINERS_LOSERS handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger6.log("Composing gainers/losers context...");
      const context = composeContext4({
        state: currentState,
        template: getTopGainersLosersTemplate
      });
      elizaLogger6.log("Generating content from template...");
      const result = await generateObject4({
        runtime,
        context,
        modelClass: ModelClass4.LARGE,
        schema: GetTopGainersLosersSchema
      });
      if (!isGetTopGainersLosersContent(result.object)) {
        elizaLogger6.error("Invalid gainers/losers request format");
        return false;
      }
      const content = result.object;
      elizaLogger6.log("Generated content:", content);
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger6.log("Fetching top gainers/losers data...");
      elizaLogger6.log("API request params:", {
        vs_currency: content.vs_currency,
        duration: content.duration,
        top_coins: content.top_coins
      });
      const response = await axios6.get(
        `${baseUrl}/coins/top_gainers_losers`,
        {
          headers: {
            "accept": "application/json",
            [headerKey]: apiKey
          },
          params: {
            vs_currency: content.vs_currency,
            duration: content.duration,
            top_coins: content.top_coins
          }
        }
      );
      if (!response.data) {
        throw new Error("No data received from CoinGecko API");
      }
      const responseText = [
        "Top Gainers:",
        ...response.data.top_gainers.map((coin, index) => {
          const changeKey = `usd_${content.duration}_change`;
          const change = coin[changeKey];
          return `${index + 1}. ${coin.name} (${coin.symbol.toUpperCase()}) | $${coin.usd.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} | ${change >= 0 ? "+" : ""}${change.toFixed(2)}%${coin.market_cap_rank ? ` | Rank #${coin.market_cap_rank}` : ""}`;
        }),
        "",
        "Top Losers:",
        ...response.data.top_losers.map((coin, index) => {
          const changeKey = `usd_${content.duration}_change`;
          const change = coin[changeKey];
          return `${index + 1}. ${coin.name} (${coin.symbol.toUpperCase()}) | $${coin.usd.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} | ${change >= 0 ? "+" : ""}${change.toFixed(2)}%${coin.market_cap_rank ? ` | Rank #${coin.market_cap_rank}` : ""}`;
        })
      ].join("\n");
      if (callback) {
        callback({
          text: responseText,
          content: {
            data: response.data,
            params: {
              vs_currency: content.vs_currency,
              duration: content.duration,
              top_coins: content.top_coins
            }
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger6.error("Error in GET_TOP_GAINERS_LOSERS handler:", error);
      let errorMessage;
      if (((_a = error.response) == null ? void 0 : _a.status) === 429) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (((_b = error.response) == null ? void 0 : _b.status) === 403) {
        errorMessage = "This endpoint requires a CoinGecko Pro API key. Please upgrade your plan to access this data.";
      } else if (((_c = error.response) == null ? void 0 : _c.status) === 400) {
        errorMessage = "Invalid request parameters. Please check your input.";
      } else {
        errorMessage = `Error fetching top gainers/losers data: ${error.message}`;
      }
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: (_d = error.response) == null ? void 0 : _d.status,
            params: (_e = error.config) == null ? void 0 : _e.params,
            requiresProPlan: ((_f = error.response) == null ? void 0 : _f.status) === 403
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the top gaining and losing cryptocurrencies?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the top gainers and losers for you.",
          action: "GET_TOP_GAINERS_LOSERS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the top gainers and losers:\nTop Gainers:\n1. Bitcoin (BTC) | $45,000 | +5.2% | Rank #1\n{{dynamic}}"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me the best and worst performing crypto today"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch the current top movers in the crypto market.",
          action: "GET_TOP_GAINERS_LOSERS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are today's best and worst performers:\n{{dynamic}}"
        }
      }
    ]
  ]
};

// src/actions/getTrending.ts
import {
  composeContext as composeContext5,
  elizaLogger as elizaLogger7,
  generateObject as generateObject5,
  ModelClass as ModelClass5
} from "@elizaos/core";
import axios7 from "axios";
import { z as z6 } from "zod";

// src/templates/trending.ts
var getTrendingTemplate = `
Extract the following parameters for trending data:
- **include_nfts** (boolean): Whether to include NFTs in the response (default: true)
- **include_categories** (boolean): Whether to include categories in the response (default: true)

Provide the values in the following JSON format:

\`\`\`json
{
    "include_nfts": true,
    "include_categories": true
}
\`\`\`

Example request: "What's trending in crypto?"
Example response:
\`\`\`json
{
    "include_nfts": true,
    "include_categories": true
}
\`\`\`

Example request: "Show me trending coins only"
Example response:
\`\`\`json
{
    "include_nfts": false,
    "include_categories": false
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}

Based on the conversation above, if the request is for trending market data, extract the appropriate parameters and respond with a JSON object. If the request is not related to trending data, respond with null.`;

// src/actions/getTrending.ts
var GetTrendingSchema = z6.object({
  include_nfts: z6.boolean().default(true),
  include_categories: z6.boolean().default(true)
});
var isGetTrendingContent = (obj) => {
  return GetTrendingSchema.safeParse(obj).success;
};
var getTrending_default = {
  name: "GET_TRENDING",
  similes: [
    "TRENDING_COINS",
    "TRENDING_CRYPTO",
    "HOT_COINS",
    "POPULAR_COINS",
    "TRENDING_SEARCH"
  ],
  // eslint-disable-next-line
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get list of trending cryptocurrencies, NFTs, and categories from CoinGecko",
  handler: async (runtime, message, state, _options, callback) => {
    var _a, _b;
    elizaLogger7.log("Starting CoinGecko GET_TRENDING handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger7.log("Composing trending context...");
      const trendingContext = composeContext5({
        state: currentState,
        template: getTrendingTemplate
      });
      const result = await generateObject5({
        runtime,
        context: trendingContext,
        modelClass: ModelClass5.LARGE,
        schema: GetTrendingSchema
      });
      if (!isGetTrendingContent(result.object)) {
        elizaLogger7.error("Invalid trending request format");
        return false;
      }
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger7.log("Fetching trending data...");
      const response = await axios7.get(
        `${baseUrl}/search/trending`,
        {
          headers: {
            [headerKey]: apiKey
          }
        }
      );
      if (!response.data) {
        throw new Error("No data received from CoinGecko API");
      }
      const formattedData = {
        coins: response.data.coins.map(({ item }) => ({
          name: item.name,
          symbol: item.symbol.toUpperCase(),
          marketCapRank: item.market_cap_rank,
          id: item.id,
          thumbnail: item.thumb,
          largeImage: item.large
        })),
        nfts: response.data.nfts.map((nft) => ({
          name: nft.name,
          symbol: nft.symbol,
          id: nft.id,
          thumbnail: nft.thumb
        })),
        categories: response.data.categories.map((category) => ({
          name: category.name,
          id: category.id
        }))
      };
      const responseText = [
        "Trending Coins:",
        ...formattedData.coins.map(
          (coin, index) => `${index + 1}. ${coin.name} (${coin.symbol})${coin.marketCapRank ? ` - Rank #${coin.marketCapRank}` : ""}`
        ),
        "",
        "Trending NFTs:",
        ...formattedData.nfts.length ? formattedData.nfts.map((nft, index) => `${index + 1}. ${nft.name} (${nft.symbol})`) : ["No trending NFTs available"],
        "",
        "Trending Categories:",
        ...formattedData.categories.length ? formattedData.categories.map((category, index) => `${index + 1}. ${category.name}`) : ["No trending categories available"]
      ].join("\n");
      elizaLogger7.success("Trending data retrieved successfully!");
      if (callback) {
        callback({
          text: responseText,
          content: {
            trending: formattedData,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger7.error("Error in GET_TRENDING handler:", error);
      const errorMessage = ((_a = error.response) == null ? void 0 : _a.status) === 429 ? "Rate limit exceeded. Please try again later." : `Error fetching trending data: ${error.message}`;
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: (_b = error.response) == null ? void 0 : _b.status
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the trending cryptocurrencies?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the trending cryptocurrencies for you.",
          action: "GET_TRENDING"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the trending cryptocurrencies:\n1. Bitcoin (BTC) - Rank #1\n2. Ethereum (ETH) - Rank #2\n{{dynamic}}"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me what's hot in crypto right now"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch the current trending cryptocurrencies.",
          action: "GET_TRENDING"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the trending cryptocurrencies:\n{{dynamic}}"
        }
      }
    ]
  ]
};

// src/actions/getTrendingPools.ts
import {
  composeContext as composeContext6,
  elizaLogger as elizaLogger8,
  generateObject as generateObject6,
  ModelClass as ModelClass6
} from "@elizaos/core";
import axios8 from "axios";
import { z as z7 } from "zod";

// src/templates/trendingPools.ts
var getTrendingPoolsTemplate = `Determine if this is a trending pools request. If it is one of the specified situations, perform the corresponding action:

Situation 1: "Get all trending pools"
- Message contains: phrases like "all trending pools", "show all pools", "list all pools"
- Example: "Show me all trending pools" or "List all pools"
- Action: Return with limit=100

Situation 2: "Get specific number of pools"
- Message contains: number followed by "pools" or "top" followed by number and "pools"
- Example: "Show top 5 pools" or "Get me 20 trending pools"
- Action: Return with limit=specified number

Situation 3: "Default trending pools request"
- Message contains: general phrases like "trending pools", "hot pools", "popular pools"
- Example: "What are the trending pools?" or "Show me hot pools"
- Action: Return with limit=10

For all situations, respond with a JSON object in the format:
\`\`\`json
{
    "limit": number
}
\`\`\`

Previous conversation for context:
{{conversation}}

You are replying to: {{message}}
`;

// src/actions/getTrendingPools.ts
var GetTrendingPoolsSchema = z7.object({
  limit: z7.number().min(1).max(100).default(10)
});
var isGetTrendingPoolsContent = (obj) => {
  return GetTrendingPoolsSchema.safeParse(obj).success;
};
var getTrendingPools_default = {
  name: "GET_TRENDING_POOLS",
  similes: ["TRENDING_POOLS", "HOT_POOLS", "POPULAR_POOLS", "TOP_POOLS"],
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get list of trending pools from CoinGecko's onchain data",
  handler: async (runtime, message, state, _options, callback) => {
    var _a, _b;
    elizaLogger8.log("Starting CoinGecko GET_TRENDING_POOLS handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger8.log("Composing trending pools context...");
      const trendingContext = composeContext6({
        state: currentState,
        template: getTrendingPoolsTemplate
      });
      const result = await generateObject6({
        runtime,
        context: trendingContext,
        modelClass: ModelClass6.LARGE,
        schema: GetTrendingPoolsSchema
      });
      if (!isGetTrendingPoolsContent(result.object)) {
        elizaLogger8.error("Invalid trending pools request format");
        return false;
      }
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger8.log("Fetching trending pools data...");
      const response = await axios8.get(
        `${baseUrl}/onchain/networks/trending_pools?include=base_token,dex`,
        {
          headers: {
            [headerKey]: apiKey
          }
        }
      );
      if (!response.data) {
        throw new Error("No data received from CoinGecko API");
      }
      const formattedData = response.data.data.map((pool) => ({
        name: pool.attributes.name,
        marketCap: Number(
          pool.attributes.market_cap_usd
        ).toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        }),
        fdv: Number(pool.attributes.fdv_usd).toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        }),
        reserveUSD: Number(
          pool.attributes.reserve_in_usd
        ).toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        }),
        createdAt: new Date(
          pool.attributes.pool_created_at
        ).toLocaleDateString()
      }));
      const responseText = [
        "Trending Pools Overview:",
        "",
        ...formattedData.map(
          (pool, index) => [
            `${index + 1}. ${pool.name}`,
            `   Market Cap: ${pool.marketCap}`,
            `   FDV: ${pool.fdv}`,
            `   Reserve: ${pool.reserveUSD}`,
            `   Created: ${pool.createdAt}`,
            ""
          ].join("\n")
        )
      ].join("\n");
      elizaLogger8.success("Trending pools data retrieved successfully!");
      if (callback) {
        callback({
          text: responseText,
          content: {
            trendingPools: formattedData,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger8.error("Error in GET_TRENDING_POOLS handler:", error);
      const errorMessage = ((_a = error.response) == null ? void 0 : _a.status) === 429 ? "Rate limit exceeded. Please try again later." : `Error fetching trending pools data: ${error.message}`;
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: (_b = error.response) == null ? void 0 : _b.status
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me trending liquidity pools"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the trending liquidity pools for you.",
          action: "GET_TRENDING_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the trending liquidity pools:\n1. MELANIA / USDC\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025\n2. TRUMP / USDC\n   Market Cap: $8,844,297,825\n   FDV: $43,874,068,484\n   Reserve: $718,413,745\n   Created: 1/17/2025"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the top hottest dex pools?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch the top hottest DEX pools for you.",
          action: "GET_TRENDING_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the top 5 hottest DEX pools:\n1. TRUMP / USDC\n   Market Cap: $8,844,297,825\n   FDV: $43,874,068,484\n   Reserve: $718,413,745\n   Created: 1/17/2025\n2. MELANIA / USDC\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "List all trading pools with highest volume"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll get all the trending trading pools for you.",
          action: "GET_TRENDING_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are all trending trading pools:\n1. MELANIA / USDC\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025\n2. TRUMP / USDC\n   Market Cap: $8,844,297,825\n   FDV: $43,874,068,484\n   Reserve: $718,413,745\n   Created: 1/17/2025"
        }
      }
    ]
  ]
};

// src/actions/getNewlyListed.ts
import {
  composeContext as composeContext7,
  elizaLogger as elizaLogger9,
  generateObject as generateObject7,
  ModelClass as ModelClass7
} from "@elizaos/core";
import axios9 from "axios";
import { z as z8 } from "zod";

// src/templates/newCoins.ts
var getNewCoinsTemplate = `Determine if this is a new coins request. If it is one of the specified situations, perform the corresponding action:

Situation 1: "Get all new coins"
- Message contains: phrases like "all new coins", "all recent listings", "all latest coins"
- Example: "Show me all new coin listings" or "List all recently added coins"
- Action: Return with limit=50

Situation 2: "Get specific number of new coins"
- Message contains: number followed by "new coins" or "latest" followed by number and "coins"
- Example: "Show me 5 new coins" or "Get the latest 20 coins"
- Action: Return with limit=specified number

Situation 3: "Default new coins request"
- Message contains: general phrases like "new coins", "recent listings", "latest coins"
- Example: "What are the newest coins?" or "Show me recent listings"
- Action: Return with limit=10

For all situations, respond with a JSON object in the format:
\`\`\`json
{
    "limit": number
}
\`\`\`

Previous conversation for context:
{{conversation}}

You are replying to: {{message}}
`;

// src/actions/getNewlyListed.ts
var GetNewCoinsSchema = z8.object({
  limit: z8.number().min(1).max(50).default(10)
});
var isGetNewCoinsContent = (obj) => {
  return GetNewCoinsSchema.safeParse(obj).success;
};
var getNewlyListed_default = {
  name: "GET_NEW_COINS",
  similes: [
    "NEW_COINS",
    "RECENTLY_ADDED",
    "NEW_LISTINGS",
    "LATEST_COINS"
  ],
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get list of recently added coins from CoinGecko",
  handler: async (runtime, message, state, _options, callback) => {
    var _a, _b;
    elizaLogger9.log("Starting CoinGecko GET_NEW_COINS handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger9.log("Composing new coins context...");
      const newCoinsContext = composeContext7({
        state: currentState,
        template: getNewCoinsTemplate
      });
      const result = await generateObject7({
        runtime,
        context: newCoinsContext,
        modelClass: ModelClass7.LARGE,
        schema: GetNewCoinsSchema
      });
      if (!isGetNewCoinsContent(result.object)) {
        elizaLogger9.error("Invalid new coins request format");
        return false;
      }
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger9.log("Fetching new coins data...");
      const response = await axios9.get(
        `${baseUrl}/coins/list/new`,
        {
          headers: {
            [headerKey]: apiKey
          }
        }
      );
      if (!response.data) {
        throw new Error("No data received from CoinGecko API");
      }
      const formattedData = response.data.slice(0, result.object.limit).map((coin) => ({
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        activatedAt: new Date(coin.activated_at * 1e3).toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      }));
      const responseText = [
        "Recently Added Coins:",
        "",
        ...formattedData.map(
          (coin, index) => `${index + 1}. ${coin.name} (${coin.symbol})
   Listed: ${coin.activatedAt}`
        )
      ].join("\n");
      elizaLogger9.success("New coins data retrieved successfully!");
      if (callback) {
        callback({
          text: responseText,
          content: {
            newCoins: formattedData,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger9.error("Error in GET_NEW_COINS handler:", error);
      const errorMessage = ((_a = error.response) == null ? void 0 : _a.status) === 429 ? "Rate limit exceeded. Please try again later." : `Error fetching new coins data: ${error.message}`;
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: (_b = error.response) == null ? void 0 : _b.status
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the newest coins listed?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the recently added coins for you.",
          action: "GET_NEW_COINS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the recently added coins:\n1. Verb Ai (VERB)\n   Listed: January 20, 2025, 12:31 PM\n{{dynamic}}"
        }
      }
    ]
  ]
};

// src/actions/getNetworkTrendingPools.ts
import {
  composeContext as composeContext8,
  elizaLogger as elizaLogger11,
  generateObject as generateObject8,
  ModelClass as ModelClass8
} from "@elizaos/core";
import axios11 from "axios";
import { z as z9 } from "zod";

// src/templates/networkTrendingPools.ts
var getNetworkTrendingPoolsTemplate = `Determine if this is a network-specific trending pools request. If it is one of the specified situations, extract the network ID and limit:

Situation 1: "Get network trending pools"
- Message contains: network name (e.g., "solana", "ethereum", "bsc") AND phrases about pools
- Example: "Show trending pools on Solana" or "What are the hot pools on ETH?"
- Action: Extract network ID and use default limit

Situation 2: "Get specific number of network pools"
- Message contains: number AND network name AND pools reference
- Example: "Show top 5 pools on BSC" or "Get 20 trending pools on Ethereum"
- Action: Extract network ID and specific limit

Situation 3: "Get all network pools"
- Message contains: "all" AND network name AND pools reference
- Example: "Show all trending pools on Polygon" or "List all hot pools on Avalanche"
- Action: Extract network ID and set maximum limit

Network ID mappings:
- "solana", "sol" => "solana"
- "ethereum", "eth" => "eth"
- "binance smart chain", "bsc", "bnb chain" => "bsc"
- "polygon", "matic" => "polygon_pos"
- "avalanche", "avax" => "avax"

For all situations, respond with a JSON object in the format:
\`\`\`json
{
    "networkId": string,
    "limit": number
}
\`\`\`

Previous conversation for context:
{{conversation}}

You are replying to: {{message}}
`;

// src/providers/networkProvider.ts
import {
  elizaLogger as elizaLogger10
} from "@elizaos/core";
import axios10 from "axios";
var CACHE_KEY3 = "coingecko:networks";
var CACHE_TTL3 = 30 * 60;
var MAX_RETRIES3 = 3;
async function fetchNetworks(runtime) {
  var _a, _b;
  const config = await validateCoingeckoConfig(runtime);
  const { baseUrl, apiKey, headerKey } = getApiConfig(config);
  const response = await axios10.get(
    `${baseUrl}/onchain/networks`,
    {
      headers: {
        accept: "application/json",
        [headerKey]: apiKey
      },
      timeout: 5e3
      // 5 second timeout
    }
  );
  if (!((_b = (_a = response.data) == null ? void 0 : _a.data) == null ? void 0 : _b.length)) {
    throw new Error("Invalid networks data received");
  }
  return response.data.data;
}
async function fetchWithRetry3(runtime) {
  let lastError = null;
  for (let i = 0; i < MAX_RETRIES3; i++) {
    try {
      return await fetchNetworks(runtime);
    } catch (error) {
      lastError = error;
      elizaLogger10.error(`Networks fetch attempt ${i + 1} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, 1e3 * (i + 1)));
    }
  }
  throw lastError || new Error("Failed to fetch networks after multiple attempts");
}
async function getNetworks(runtime) {
  try {
    const cached = await runtime.cacheManager.get(CACHE_KEY3);
    if (cached) {
      return cached;
    }
    const networks = await fetchWithRetry3(runtime);
    await runtime.cacheManager.set(CACHE_KEY3, networks, {
      expires: CACHE_TTL3
    });
    return networks;
  } catch (error) {
    elizaLogger10.error("Error fetching networks:", error);
    throw error;
  }
}
function formatNetworksContext(networks) {
  const mainNetworks = ["eth", "bsc", "polygon_pos", "avax", "solana"];
  const popular = networks.filter((n) => mainNetworks.includes(n.id)).map((n) => `${n.attributes.name} - ID: ${n.id}`);
  return `
Available blockchain networks:

Major networks:
${popular.map((n) => `- ${n}`).join("\n")}

Total available networks: ${networks.length}

You can use these network IDs when querying network-specific data.
`.trim();
}
var networksProvider = {
  // eslint-disable-next-line
  get: async (runtime, message, state) => {
    try {
      const networks = await getNetworks(runtime);
      return formatNetworksContext(networks);
    } catch (error) {
      elizaLogger10.error("Networks provider error:", error);
      return "Blockchain networks list is temporarily unavailable. Please try again later.";
    }
  }
};
async function getNetworksData(runtime) {
  return getNetworks(runtime);
}

// src/actions/getNetworkTrendingPools.ts
var GetNetworkTrendingPoolsSchema = z9.object({
  networkId: z9.string(),
  limit: z9.number().min(1).max(100).default(10)
});
var isGetNetworkTrendingPoolsContent = (obj) => {
  return GetNetworkTrendingPoolsSchema.safeParse(obj).success;
};
var getNetworkTrendingPools_default = {
  name: "GET_NETWORK_TRENDING_POOLS",
  similes: [
    "NETWORK_TRENDING_POOLS",
    "CHAIN_HOT_POOLS",
    "BLOCKCHAIN_POPULAR_POOLS"
  ],
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get list of trending pools for a specific network from CoinGecko's onchain data",
  handler: async (runtime, message, state, _options, callback) => {
    var _a, _b;
    elizaLogger11.log(
      "Starting CoinGecko GET_NETWORK_TRENDING_POOLS handler..."
    );
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger11.log("Composing network trending pools context...");
      const trendingContext = composeContext8({
        state: currentState,
        template: getNetworkTrendingPoolsTemplate
      });
      const result = await generateObject8({
        runtime,
        context: trendingContext,
        modelClass: ModelClass8.LARGE,
        schema: GetNetworkTrendingPoolsSchema
      });
      if (!isGetNetworkTrendingPoolsContent(result.object)) {
        elizaLogger11.error(
          "Invalid network trending pools request format"
        );
        return false;
      }
      const networks = await getNetworksData(runtime);
      const network = networks.find((n) => {
        const searchTerm = result.object.networkId.toLowerCase();
        return n.id.toLowerCase() === searchTerm || n.attributes.name.toLowerCase().includes(searchTerm) || n.attributes.coingecko_asset_platform_id.toLowerCase() === searchTerm;
      });
      if (!network) {
        throw new Error(
          `Network ${result.object.networkId} not found in available networks`
        );
      }
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger11.log(
        `Fetching trending pools data for network: ${network.id}`
      );
      const response = await axios11.get(
        `${baseUrl}/onchain/networks/${network.id}/trending_pools?include=base_token,dex`,
        {
          headers: {
            [headerKey]: apiKey
          }
        }
      );
      if (!response.data) {
        throw new Error("No data received from CoinGecko API");
      }
      const formattedData = response.data.data.slice(0, result.object.limit).map((pool) => ({
        name: pool.attributes.name,
        marketCap: Number(
          pool.attributes.market_cap_usd
        ).toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        }),
        fdv: Number(pool.attributes.fdv_usd).toLocaleString(
          "en-US",
          {
            style: "currency",
            currency: "USD"
          }
        ),
        reserveUSD: Number(
          pool.attributes.reserve_in_usd
        ).toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        }),
        createdAt: new Date(
          pool.attributes.pool_created_at
        ).toLocaleDateString()
      }));
      const responseText = [
        `Trending Pools Overview for ${network.attributes.name}:`,
        "",
        ...formattedData.map(
          (pool, index) => [
            `${index + 1}. ${pool.name}`,
            `   Market Cap: ${pool.marketCap}`,
            `   FDV: ${pool.fdv}`,
            `   Reserve: ${pool.reserveUSD}`,
            `   Created: ${pool.createdAt}`,
            ""
          ].join("\n")
        )
      ].join("\n");
      elizaLogger11.success(
        "Network trending pools data retrieved successfully!"
      );
      if (callback) {
        callback({
          text: responseText,
          content: {
            networkId: network.id,
            networkName: network.attributes.name,
            trendingPools: formattedData,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger11.error(
        "Error in GET_NETWORK_TRENDING_POOLS handler:",
        error
      );
      const errorMessage = ((_a = error.response) == null ? void 0 : _a.status) === 429 ? "Rate limit exceeded. Please try again later." : `Error fetching trending pools data: ${error.message}`;
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: (_b = error.response) == null ? void 0 : _b.status
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me trending liquidity pools on Solana"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the trending Solana liquidity pools for you.",
          action: "GET_NETWORK_TRENDING_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the trending pools on SOLANA:\n1. MELANIA / USDC\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025\n2. TRUMP / USDC\n   Market Cap: $8,844,297,825\n   FDV: $43,874,068,484\n   Reserve: $718,413,745\n   Created: 1/17/2025"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the top 5 hottest pools on Ethereum?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch the top 5 hottest pools on Ethereum for you.",
          action: "GET_NETWORK_TRENDING_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the top 5 trending pools on ETHEREUM:\n1. PEPE / WETH\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "List all BSC pools with highest volume"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll get all the trending pools on BSC for you.",
          action: "GET_NETWORK_TRENDING_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are all trending pools on BSC:\n1. CAKE / WBNB\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025"
        }
      }
    ]
  ]
};

// src/actions/getNetworkNewPools.ts
import {
  composeContext as composeContext9,
  elizaLogger as elizaLogger12,
  generateObject as generateObject9,
  ModelClass as ModelClass9
} from "@elizaos/core";
import axios12 from "axios";
import { z as z10 } from "zod";

// src/templates/networkNewPools.ts
var getNetworkNewPoolsTemplate = `Determine if this is a network-specific new pools request. If it is one of the specified situations, extract the network ID and limit:

Situation 1: "Get network new pools"
- Message contains: network name AND phrases about new/recent/latest pools
- Example: "Show new pools on Ethereum" or "What are the latest pools on BSC?"
- Action: Extract network ID and use default limit

Situation 2: "Get specific number of new pools"
- Message contains: number AND network name AND new/recent/latest pools reference
- Example: "Show 5 newest pools on Polygon" or "Get 20 latest pools on Avalanche"
- Action: Extract network ID and specific limit

Situation 3: "Get all new pools"
- Message contains: "all" AND network name AND new/recent/latest pools reference
- Example: "Show all new pools on BSC" or "List all recent pools on Ethereum"
- Action: Extract network ID and set maximum limit

Network ID mappings:
- "solana", "sol" => "solana"
- "ethereum", "eth" => "eth"
- "binance smart chain", "bsc", "bnb chain" => "bsc"
- "polygon", "matic" => "polygon_pos"
- "avalanche", "avax" => "avax"

For all situations, respond with a JSON object in the format:
\`\`\`json
{
    "networkId": string,
    "limit": number
}
\`\`\`

Previous conversation for context:
{{conversation}}

You are replying to: {{message}}
`;

// src/actions/getNetworkNewPools.ts
var GetNetworkNewPoolsSchema = z10.object({
  networkId: z10.string(),
  limit: z10.number().min(1).max(100).default(10)
});
var isGetNetworkNewPoolsContent = (obj) => {
  return GetNetworkNewPoolsSchema.safeParse(obj).success;
};
var getNetworkNewPools_default = {
  name: "GET_NETWORK_NEW_POOLS",
  similes: [
    "NETWORK_NEW_POOLS",
    "CHAIN_NEW_POOLS",
    "NEW_POOLS_BY_NETWORK",
    "RECENT_POOLS",
    "LATEST_POOLS"
  ],
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get list of newly created pools for a specific network from CoinGecko's onchain data",
  handler: async (runtime, message, state, _options, callback) => {
    var _a, _b;
    elizaLogger12.log("Starting CoinGecko GET_NETWORK_NEW_POOLS handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger12.log("Composing network new pools context...");
      const newPoolsContext = composeContext9({
        state: currentState,
        template: getNetworkNewPoolsTemplate
      });
      const result = await generateObject9({
        runtime,
        context: newPoolsContext,
        modelClass: ModelClass9.LARGE,
        schema: GetNetworkNewPoolsSchema
      });
      if (!isGetNetworkNewPoolsContent(result.object)) {
        elizaLogger12.error("Invalid network new pools request format");
        return false;
      }
      const networks = await getNetworksData(runtime);
      const networksResponse = await getNetworksData(runtime);
      const network = networksResponse.find((n) => {
        const searchTerm = result.object.networkId.toLowerCase();
        return n.id.toLowerCase() === searchTerm || n.attributes.name.toLowerCase().includes(searchTerm) || n.attributes.coingecko_asset_platform_id.toLowerCase() === searchTerm;
      });
      if (!network) {
        throw new Error(
          `Network ${result.object.networkId} not found in available networks`
        );
      }
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger12.log(
        `Fetching new pools data for network: ${network.id}`
      );
      const response = await axios12.get(
        `${baseUrl}/onchain/networks/${network.id}/new_pools?include=base_token,dex`,
        {
          headers: {
            [headerKey]: apiKey
          }
        }
      );
      if (!response.data) {
        throw new Error("No data received from CoinGecko API");
      }
      const formattedData = response.data.data.slice(0, result.object.limit).map((pool) => ({
        name: pool.attributes.name,
        marketCap: Number(
          pool.attributes.market_cap_usd
        ).toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        }),
        fdv: Number(pool.attributes.fdv_usd).toLocaleString(
          "en-US",
          {
            style: "currency",
            currency: "USD"
          }
        ),
        reserveUSD: Number(
          pool.attributes.reserve_in_usd
        ).toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        }),
        createdAt: new Date(
          pool.attributes.pool_created_at
        ).toLocaleDateString()
      }));
      const responseText = [
        `New Pools Overview for ${network.attributes.name}:`,
        "",
        ...formattedData.map(
          (pool, index) => [
            `${index + 1}. ${pool.name}`,
            `   Market Cap: ${pool.marketCap}`,
            `   FDV: ${pool.fdv}`,
            `   Reserve: ${pool.reserveUSD}`,
            `   Created: ${pool.createdAt}`,
            ""
          ].join("\n")
        )
      ].join("\n");
      elizaLogger12.success(
        "Network new pools data retrieved successfully!"
      );
      if (callback) {
        callback({
          text: responseText,
          content: {
            networkId: network.id,
            networkName: network.attributes.name,
            newPools: formattedData,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger12.error("Error in GET_NETWORK_NEW_POOLS handler:", error);
      const errorMessage = ((_a = error.response) == null ? void 0 : _a.status) === 429 ? "Rate limit exceeded. Please try again later." : `Error fetching new pools data: ${error.message}`;
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: (_b = error.response) == null ? void 0 : _b.status
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me new liquidity pools on Ethereum"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the new Ethereum liquidity pools for you.",
          action: "GET_NETWORK_NEW_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the new pools on ETHEREUM:\n1. PEPE / WETH\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025\n2. SUSHI / WETH\n   Market Cap: $8,844,297,825\n   FDV: $43,874,068,484\n   Reserve: $718,413,745\n   Created: 1/17/2025"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the 5 latest pools on BSC?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch the 5 latest pools on BSC for you.",
          action: "GET_NETWORK_NEW_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the 5 newest pools on BSC:\n1. CAKE / WBNB\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "List all recent pools on Polygon"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll get all the recently added pools on Polygon for you.",
          action: "GET_NETWORK_NEW_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are all new pools on POLYGON:\n1. MATIC / USDC\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025"
        }
      }
    ]
  ]
};

// src/index.ts
var coingeckoPlugin = {
  name: "coingecko",
  description: "CoinGecko Plugin for Eliza",
  actions: [
    getPrice_default,
    getPricePerAddress_default,
    getTrending_default,
    getTrendingPools_default,
    getMarkets_default,
    getTopGainersLosers_default,
    getNewlyListed_default,
    getNetworkTrendingPools_default,
    getNetworkNewPools_default
  ],
  evaluators: [],
  providers: [categoriesProvider, coinsProvider, networksProvider]
};
var index_default = coingeckoPlugin;
export {
  coingeckoPlugin,
  index_default as default
};
//# sourceMappingURL=index.js.map