import { logger } from "#utils/logger";

const imageCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const providers = {
  async waifuPics(category) {
    const categoryMap = {
      anime: "waifu",
      waifu: "waifu",
      neko: "neko",
      shinobu: "shinobu",
      megumin: "megumin",
      awoo: "awoo",
      happy: "happy",
      smile: "smile",
    };

    const endpoint = categoryMap[category] || "waifu";
    
    try {
      const response = await fetch(`https://api.waifu.pics/sfw/${endpoint}`);
      if (!response.ok) throw new Error("Failed to fetch from waifu.pics");
      const data = await response.json();
      return data.url;
    } catch (error) {
      logger.warn("ImageService", `waifu.pics failed: ${error.message}`);
      return null;
    }
  },

  async nekosBest(category) {
    const categoryMap = {
      anime: "neko",
      neko: "neko",
      kitsune: "kitsune",
      waifu: "waifu",
      husbando: "husbando",
    };

    const endpoint = categoryMap[category] || "neko";
    
    try {
      const response = await fetch(`https://nekos.best/api/v2/${endpoint}`);
      if (!response.ok) throw new Error("Failed to fetch from nekos.best");
      const data = await response.json();
      return data.results?.[0]?.url;
    } catch (error) {
      logger.warn("ImageService", `nekos.best failed: ${error.message}`);
      return null;
    }
  },

  async nekosLife(category) {
    const categoryMap = {
      anime: "neko",
      neko: "neko",
      fox: "fox_girl",
      waifu: "waifu",
      avatar: "avatar",
    };

    const endpoint = categoryMap[category] || "neko";
    
    try {
      const response = await fetch(`https://nekos.life/api/v2/img/${endpoint}`);
      if (!response.ok) throw new Error("Failed to fetch from nekos.life");
      const data = await response.json();
      return data.url;
    } catch (error) {
      logger.warn("ImageService", `nekos.life failed: ${error.message}`);
      return null;
    }
  },

  async picsum(category) {
    try {
      const randomId = Math.floor(Math.random() * 1000);
      return `https://picsum.photos/seed/${randomId}/512/512`;
    } catch (error) {
      logger.warn("ImageService", `picsum failed: ${error.message}`);
      return null;
    }
  },
};

const categoryProviders = {
  anime: ["waifuPics", "nekosBest", "nekosLife"],
  neko: ["nekosBest", "nekosLife", "waifuPics"],
  waifu: ["waifuPics", "nekosBest"],
  boys: ["nekosBest"],
  girls: ["waifuPics", "nekosBest", "nekosLife"],
  couples: ["waifuPics"],
  banners: ["picsum"],
  kitsune: ["nekosBest"],
  husbando: ["nekosBest"],
};

export class ImageService {
  static async getRandomImage(category) {
    const normalizedCategory = category.toLowerCase();
    
    const cacheKey = `${normalizedCategory}-${Date.now()}`;
    const cached = imageCache.get(normalizedCategory);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    }

    const providerList = categoryProviders[normalizedCategory] || ["waifuPics"];

    for (const providerName of providerList) {
      const provider = providers[providerName];
      if (!provider) continue;

      try {
        const imageUrl = await provider(normalizedCategory);
        if (imageUrl) {
          imageCache.set(normalizedCategory, {
            url: imageUrl,
            timestamp: Date.now(),
          });
          return imageUrl;
        }
      } catch (error) {
        logger.warn("ImageService", `Provider ${providerName} failed for ${normalizedCategory}`);
      }
    }

    logger.error("ImageService", `All providers failed for category: ${normalizedCategory}`);
    return null;
  }

  static async getMultipleImages(category, count = 5) {
    const images = [];
    const promises = [];

    for (let i = 0; i < count; i++) {
      promises.push(this.getRandomImage(category));
    }

    const results = await Promise.allSettled(promises);
    
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        images.push(result.value);
      }
    }

    return images;
  }

  static getAvailableCategories() {
    return Object.keys(categoryProviders);
  }
}

export default ImageService;
