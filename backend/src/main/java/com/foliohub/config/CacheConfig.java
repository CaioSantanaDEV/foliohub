package com.foliohub.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    public static final String STOCK_QUOTES_CACHE = "stock-quotes";
    public static final String MACRO_INDICATORS_CACHE = "macro-indicators";

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager manager = new SimpleCacheManager();

        CaffeineCache stockQuotesCache = new CaffeineCache(
                STOCK_QUOTES_CACHE,
                Caffeine.newBuilder()
                        .expireAfterWrite(15, TimeUnit.MINUTES)
                        .maximumSize(1000)
                        .recordStats()
                        .build()
        );

        CaffeineCache macroIndicatorsCache = new CaffeineCache(
                MACRO_INDICATORS_CACHE,
                Caffeine.newBuilder()
                        .expireAfterWrite(24, TimeUnit.HOURS)
                        .maximumSize(100)
                        .recordStats()
                        .build()
        );

        manager.setCaches(List.of(stockQuotesCache, macroIndicatorsCache));
        return manager;
    }
}
